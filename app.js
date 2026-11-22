const $ = (id) => document.getElementById(id);
const STORE_KEY = "abareyesmagos_centro_impresion_demo_v02";
const RATE_KEY = "abareyesmagos_centro_impresion_rates_v02";
const defaultRates = { bn: 1.5, color: 5, legal: 1 };
const CFG = window.CONFIG || {};
const WA = String(CFG.whatsapp||"").replace(/\D/g,"");
const SB = (CFG.supabaseUrl && CFG.supabaseKey && window.supabase) ? window.supabase.createClient(CFG.supabaseUrl, CFG.supabaseKey) : null;
if (CFG.supabaseUrl && !SB) console.warn("Supabase no cargó: se usa el modo local.");
const BUCKET = "documentos";
let lastOrder = null;
let selectedFile = null;
let copies = 1;
let orders = SB ? [] : loadOrders();
let rates = loadRates();

function loadOrders(){ try{return JSON.parse(localStorage.getItem(STORE_KEY)||"[]")}catch{return []} }
function saveOrders(){ if(SB)return; localStorage.setItem(STORE_KEY,JSON.stringify(orders)); }
function loadRates(){ try{return {...defaultRates,...JSON.parse(localStorage.getItem(RATE_KEY)||"{}")}}catch{return {...defaultRates}} }
function money(n){return new Intl.NumberFormat("es-MX",{style:"currency",currency:"MXN"}).format(n)}
function safeText(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function currentColor(){return document.querySelector('input[name="color"]:checked').value}
function priceEstimate(){
  const pages=Math.max(1,Math.min(300,Number($("pages").value)||1));
  const base=currentColor()==="color"?rates.color:rates.bn;
  const extra=$("paperSize").value==="oficio"?rates.legal:0;
  return pages*copies*(base+extra);
}
function updateSummary(){
  const pages=Math.max(1,Math.min(300,Number($("pages").value)||1));
  $("pages").value=pages;
  $("copiesOutput").textContent=copies;
  $("summaryFile").textContent=selectedFile?selectedFile.name:"Sin archivo seleccionado";
  $("summaryDetails").textContent=selectedFile?`${(selectedFile.size/1024/1024).toFixed(2)} MB`:"Agrega tu documento para comenzar";
  $("summaryColor").textContent=currentColor()==="color"?"A color":"Blanco y negro";
  $("summarySize").textContent=$("paperSize").value==="oficio"?"Oficio":"Carta";
  $("summarySheets").textContent=pages*copies;
  $("summaryCopies").textContent=copies;
  $("totalInline").textContent=money(priceEstimate());
  $("estimatedPrice").textContent=money(priceEstimate());
}
function setFile(file){
  if(!file)return;
  const allowed=["application/pdf","image/jpeg","image/png"];
  const ext=file.name.split(".").pop().toLowerCase();
  if(!allowed.includes(file.type)&&!["pdf","jpg","jpeg","png"].includes(ext)){alert("Selecciona un archivo PDF, JPG o PNG.");return}
  if(file.size>15*1024*1024){alert("El archivo supera el límite de 15 MB de esta demostración.");return}
  selectedFile=file;
  detectPages(file);
  $("fileTitle").textContent=file.name;
  $("fileSub").textContent=`${(file.size/1024/1024).toFixed(2)} MB · Archivo seleccionado en este dispositivo`;
  updateSummary();
}
$("fileInput").addEventListener("change",e=>setFile(e.target.files[0]));
$("dropZone").addEventListener("dragover",e=>{e.preventDefault();$("dropZone").classList.add("dragover")});
$("dropZone").addEventListener("dragleave",()=>$("dropZone").classList.remove("dragover"));
$("dropZone").addEventListener("drop",e=>{e.preventDefault();$("dropZone").classList.remove("dragover");setFile(e.dataTransfer.files[0])});
$("minusCopies").onclick=()=>{copies=Math.max(1,copies-1);updateSummary()};
$("plusCopies").onclick=()=>{copies=Math.min(99,copies+1);updateSummary()};
["pages","paperSize"].forEach(id=>$(id).addEventListener("input",updateSummary));
document.querySelectorAll('input[name="color"]').forEach(el=>el.addEventListener("change",updateSummary));

$("requestForm").addEventListener("submit",async e=>{
  e.preventDefault();$("formError").textContent="";
  const name=$("customerName").value.trim();
  if(!selectedFile){$("formError").textContent="Primero selecciona el documento que necesitas imprimir.";return}
  if(!name){$("formError").textContent="Escribe tu nombre para identificar la solicitud.";return}
  const ph=$("customerPhone").value.replace(/\D/g,"");
  if(ph&&ph.length<10){$("formError").textContent="Revisa tu teléfono: debe tener al menos 10 dígitos.";return}
  const folio=newFolio();
  const order={folio,name,phone:$("customerPhone").value.trim(),fileName:selectedFile.name,fileSize:selectedFile.size,color:currentColor(),paper:$("paperSize").value,pages:Number($("pages").value)||1,copies,notes:$("notes").value.trim(),estimate:priceEstimate(),status:"Pendiente",createdAt:new Date().toISOString()};
  if(SB){
    const btn=$("submitBtn");btn.disabled=true;btn.firstChild.textContent="Enviando… ";
    try{await cloudSubmit(order)}catch(err){console.error(err);$("formError").textContent="No pudimos enviar tu archivo. Revisa tu conexión e inténtalo otra vez.";btn.disabled=false;btn.firstChild.textContent="Enviar solicitud ";return}
    btn.disabled=false;btn.firstChild.textContent="Enviar solicitud ";
  }else{orders.unshift(order);saveOrders()}
  $("newFolio").textContent=folio;lastOrder=order;prepareShare(order);$("successModal").classList.remove("hidden");$("closeModal").focus();
  renderAdmin();
  // El prototipo guarda metadatos solamente. El archivo no se sube ni se conserva.
});
function closeSuccess(){$("successModal").classList.add("hidden");$("requestForm").reset();selectedFile=null;lastOrder=null;copies=1;$("fileInput").value="";$("fileTitle").textContent="Toca para seleccionar tu archivo";$("fileSub").textContent="PDF, JPG o PNG · Máximo 15 MB";$("pagesHint").textContent="Si no sabes cuántas son, deja 1 y lo revisaremos.";updateSummary()}
$("closeModal").onclick=closeSuccess;
$("successModal").addEventListener("click",e=>{if(e.target===$("successModal"))closeSuccess()});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("successModal").classList.contains("hidden"))closeSuccess()});

const MIME={pdf:"application/pdf",jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png"};
async function cloudSubmit(o){
  const f=selectedFile,ext=f.name.split(".").pop().toLowerCase();
  const safe=f.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^\w.\-]+/g,"_").slice(-80);
  const path=`${o.folio}/${safe}`;
  const up=await SB.storage.from(BUCKET).upload(path,f,{contentType:MIME[ext]||f.type});
  if(up.error)throw up.error;
  const r=await SB.from("orders").insert({folio:o.folio,name:o.name,phone:o.phone,file_name:o.fileName,file_size:o.fileSize,file_path:path,color:o.color,paper:o.paper,pages:o.pages,copies:o.copies,notes:o.notes,estimate:o.estimate});
  if(r.error)throw r.error;
}
async function cloudLoadOrders(){
  const {data,error}=await SB.from("orders").select("*").order("created_at",{ascending:false}).limit(500);
  if(error){alert("No se pudieron cargar los pedidos: "+error.message);return}
  orders=data.map(r=>({folio:r.folio,name:r.name,phone:r.phone||"",fileName:r.file_name,fileSize:r.file_size,filePath:r.file_path,color:r.color,paper:r.paper,pages:r.pages,copies:r.copies,notes:r.notes||"",estimate:Number(r.estimate),status:r.status,createdAt:r.created_at}));
  renderAdmin();
}
async function cloudLoadRates(){
  const r=await SB.from("settings").select("*").eq("id",1).maybeSingle();
  if(r.data){rates={bn:Number(r.data.rate_bn),color:Number(r.data.rate_color),legal:Number(r.data.rate_legal)};renderRates();updateSummary()}
}
async function adminGate(){
  const {data}=await SB.auth.getSession(),ok=!!data.session;
  $("loginBox").classList.toggle("hidden",ok);$("adminBody").classList.toggle("hidden",!ok);$("logoutBtn").classList.toggle("hidden",!ok);
  if(ok)await cloudLoadOrders();
}
function newFolio(){const c="ABCDEFGHJKMNPQRSTUVWXYZ23456789",d=new Date();let f;do{f="CI-"+String(d.getMonth()+1).padStart(2,"0")+String(d.getDate()).padStart(2,"0")+"-"+Array.from({length:4},()=>c[Math.floor(Math.random()*c.length)]).join("")}while(orders.some(o=>o.folio===f));return f}
function orderText(o){return `Hola, quiero imprimir un documento.\nFolio: ${o.folio}\nNombre: ${o.name}\nArchivo: ${o.fileName}\n${o.color==="color"?"A color":"Blanco y negro"} · ${o.paper==="oficio"?"Oficio":"Carta"} · ${o.pages} pág. × ${o.copies} copia(s)\nTotal estimado: ${money(o.estimate)}${o.notes?"\nNota: "+o.notes:""}`}
function prepareShare(o){
  if(SB){$("successTitle").textContent="¡Listo! Recibimos tu archivo.";$("modalText").textContent="Tu solicitud ya está con nosotros. Guarda tu folio; si quieres avisarnos, escríbenos por WhatsApp.";$("waLink").firstChild.textContent="Avisar por WhatsApp "}
  const t=orderText(o),f=selectedFile;
  $("waLink").classList.toggle("hidden",!WA);
  if(WA)$("waLink").href=`https://wa.me/${WA}?text=${encodeURIComponent(t)}`;
  $("shareNote").textContent=WA?"":"El negocio aún no configura su WhatsApp: copia el resumen y envíalo por tu medio habitual.";
  const can=!SB&&!!(f&&navigator.canShare&&navigator.canShare({files:[f]}));
  $("shareFile").classList.toggle("hidden",!can);
  $("shareFile").onclick=()=>navigator.share({files:[f],text:t}).catch(()=>{});
  $("copyText").onclick=async()=>{try{await navigator.clipboard.writeText(t);$("copyText").textContent="¡Copiado!"}catch{$("copyText").textContent="No se pudo copiar"}setTimeout(()=>$("copyText").textContent="Copiar resumen",2000)};
}
async function detectPages(f){
  if(!(f.type==="application/pdf"||/\.pdf$/i.test(f.name))){$("pages").value=1;$("pagesHint").textContent="Imagen: 1 página.";updateSummary();return}
  $("pagesHint").textContent="Contando páginas…";
  try{
    if(!window.pdfjsLib)await new Promise((ok,no)=>{const s=document.createElement("script");s.src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js";s.onload=ok;s.onerror=no;document.head.appendChild(s);setTimeout(no,8000)});
    pdfjsLib.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    const pdf=await pdfjsLib.getDocument({data:new Uint8Array(await f.arrayBuffer())}).promise;
    if(f!==selectedFile)return;
    $("pages").value=Math.min(300,pdf.numPages);$("pagesHint").textContent=`Detectamos ${pdf.numPages} página(s). Cámbialo si imprimirás solo algunas.`;
  }catch{if(f===selectedFile)$("pagesHint").textContent="No pudimos contar las páginas; escríbelas tú."}
  updateSummary();
}
const PIN_KEY="abareyesmagos_ci_pin",OWNER_KEY="abareyesmagos_ci_owner";
async function sha(s){if(!window.crypto||!crypto.subtle)return s;const b=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(s));return[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function openAdmin(){
  if(SB){localStorage.setItem(OWNER_KEY,"1");showAdmin();return}
  const saved=localStorage.getItem(PIN_KEY);
  if(!saved){const p=prompt("Crea un PIN de 4 a 8 números para el panel:");if(p===null)return;if(!/^\d{4,8}$/.test(p)){alert("El PIN debe tener de 4 a 8 números.");return}localStorage.setItem(PIN_KEY,await sha(p))}
  else{const p=prompt("PIN del panel:");if(p===null)return;if(await sha(p)!==saved){alert("PIN incorrecto.");return}}
  localStorage.setItem(OWNER_KEY,"1");showAdmin();
}
function syncAdminButton(){$("adminToggle").classList.toggle("hidden",!(location.hash==="#admin"||localStorage.getItem(OWNER_KEY)))}
window.addEventListener("hashchange",syncAdminButton);
function showAdmin(){ $("clientView").classList.add("hidden");$("adminView").classList.remove("hidden");renderAdmin();window.scrollTo(0,0);if(SB)adminGate()}
function showClient(){ $("adminView").classList.add("hidden");$("clientView").classList.remove("hidden");window.scrollTo(0,0)}
$("adminToggle").onclick=openAdmin;$("backClient").onclick=showClient;

function renderAdmin(){
  $("statTotal").textContent=orders.length;
  $("statPending").textContent=orders.filter(o=>o.status==="Pendiente").length;
  $("statProcess").textContent=orders.filter(o=>["En revisión","Autorizado","Pagado","En impresión"].includes(o.status)).length;
  $("statDone").textContent=orders.filter(o=>["Entregado","Impreso"].includes(o.status)).length;
  const host=$("ordersList");
  if(!orders.length){host.innerHTML='<div class="empty-orders">Todavía no hay solicitudes. Los pedidos de prueba aparecerán aquí.</div>';return}
  host.innerHTML=orders.map(o=>`<article class="order-item"><div class="order-main"><strong>${safeText(o.folio)} · ${safeText(o.name)}</strong><small>${new Date(o.createdAt).toLocaleString("es-MX")}</small><div class="order-meta">Archivo: ${safeText(o.fileName)} (${(o.fileSize/1024/1024).toFixed(2)} MB)<br>${o.color==="color"?"A color":"Blanco y negro"} · ${o.paper==="oficio"?"Oficio":"Carta"} · ${o.pages} página(s) × ${o.copies} copia(s)<br>Estimado: ${money(o.estimate)}${o.phone?" · Tel. "+safeText(o.phone):""}${o.notes?"<br>Nota: "+safeText(o.notes):""}</div></div><div class="order-actions"><select aria-label="Estado de ${safeText(o.folio)}" data-status="${safeText(o.folio)}">${["Pendiente","En revisión","Autorizado","Pagado","En impresión","Impreso","Entregado","Rechazado","Cancelado"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select><button type="button" data-delete="${safeText(o.folio)}">Eliminar</button>${o.phone?`<button type="button" data-wa="${safeText(o.folio)}">WhatsApp</button>`:""}${o.filePath?`<button type="button" data-dl="${safeText(o.folio)}">Descargar archivo</button>`:""}</div></article>`).join("");
  host.querySelectorAll("[data-status]").forEach(el=>el.addEventListener("change",()=>{const o=orders.find(x=>x.folio===el.dataset.status);if(o){o.status=el.value;saveOrders();if(SB)SB.from("orders").update({status:o.status}).eq("folio",o.folio).then(r=>{if(r.error)alert("No se pudo guardar el estado: "+r.error.message)});renderAdmin()}}));
  host.querySelectorAll("[data-wa]").forEach(el=>el.addEventListener("click",()=>{const o=orders.find(x=>x.folio===el.dataset.wa);if(!o)return;let p=o.phone.replace(/\D/g,"");if(p.length===10)p="52"+p;window.open(`https://wa.me/${p}?text=${encodeURIComponent("Hola "+o.name+", sobre tu pedido "+o.folio+": ")}`,"_blank","noopener")}));
  host.querySelectorAll("[data-dl]").forEach(el=>el.addEventListener("click",async()=>{const o=orders.find(x=>x.folio===el.dataset.dl);if(!o)return;const r=await SB.storage.from(BUCKET).createSignedUrl(o.filePath,120,{download:o.fileName});if(r.error){alert("No se pudo abrir el archivo: "+r.error.message);return}const a=document.createElement("a");a.href=r.data.signedUrl;a.target="_blank";a.rel="noopener";a.click()}));
  host.querySelectorAll("[data-delete]").forEach(el=>el.addEventListener("click",async()=>{if(confirm("¿Eliminar esta solicitud?")){const d=orders.find(x=>x.folio===el.dataset.delete);if(SB&&d){if(d.filePath)await SB.storage.from(BUCKET).remove([d.filePath]);const r=await SB.from("orders").delete().eq("folio",d.folio);if(r.error){alert("No se pudo eliminar: "+r.error.message);return}}orders=orders.filter(x=>x.folio!==el.dataset.delete);saveOrders();renderAdmin()}}));
}
function renderRates(){$("rateBn").value=rates.bn;$("rateColor").value=rates.color;$("rateLegal").value=rates.legal}
$("saveRates").onclick=()=>{
  const bn=Number($("rateBn").value),color=Number($("rateColor").value),legal=Number($("rateLegal").value);
  if([bn,color,legal].some(n=>!Number.isFinite(n)||n<0)){alert("Ingresa tarifas válidas, iguales o mayores a cero.");return}
  rates={bn,color,legal};if(SB){SB.from("settings").upsert({id:1,rate_bn:bn,rate_color:color,rate_legal:legal}).then(r=>alert(r.error?"No se pudieron guardar: "+r.error.message:"Tarifas guardadas para todos los clientes."));updateSummary();return}localStorage.setItem(RATE_KEY,JSON.stringify(rates));updateSummary();alert("Tarifas guardadas en este dispositivo.");
};
$("exportOrders").onclick=()=>{
  if(!orders.length){alert("Todavía no hay solicitudes para exportar.");return}
  const cols=["Folio","Fecha","Nombre","Teléfono","Archivo","Tipo","Tamaño","Páginas","Copias","Estimado","Estado","Notas"];
  const rows=orders.map(o=>[o.folio,o.createdAt,o.name,o.phone,o.fileName,o.color,o.paper,o.pages,o.copies,o.estimate,o.status,o.notes]);
  const csv=[cols,...rows].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="solicitudes-centro-impresion.csv";a.click();URL.revokeObjectURL(a.href);
};
$("year").textContent=new Date().getFullYear();
syncAdminButton();renderRates();updateSummary();renderAdmin();
if(SB){
  document.querySelectorAll(".step small")[2].textContent="Sube tu archivo y recibe tu folio.";
  document.querySelector(".form-footnote").textContent="Tu archivo se envía de forma privada al negocio. Guarda tu folio.";
  $("adminNote").textContent="Panel sincronizado: aquí aparecen los pedidos de todos los clientes.";
  $("refreshOrders").classList.remove("hidden");$("adminBody").classList.add("hidden");
  $("refreshOrders").onclick=cloudLoadOrders;
  $("logoutBtn").onclick=async()=>{await SB.auth.signOut();orders=[];adminGate()};
  $("loginForm").addEventListener("submit",async e=>{e.preventDefault();$("loginError").textContent="";const r=await SB.auth.signInWithPassword({email:$("loginEmail").value.trim(),password:$("loginPass").value});if(r.error){$("loginError").textContent="Correo o contraseña incorrectos.";return}$("loginPass").value="";adminGate()});
  setInterval(()=>{if(!$("adminView").classList.contains("hidden")&&!$("adminBody").classList.contains("hidden"))cloudLoadOrders()},30000);
  cloudLoadRates();
}
