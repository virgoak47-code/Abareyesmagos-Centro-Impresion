const $ = (id) => document.getElementById(id);
const STORE_KEY = "abareyesmagos_centro_impresion_demo_v02";
const RATE_KEY = "abareyesmagos_centro_impresion_rates_v02";
const defaultRates = { bn: 1.5, color: 5, legal: 1 };
let selectedFile = null;
let copies = 1;
let orders = loadOrders();
let rates = loadRates();

function loadOrders(){ try{return JSON.parse(localStorage.getItem(STORE_KEY)||"[]")}catch{return []} }
function saveOrders(){ localStorage.setItem(STORE_KEY,JSON.stringify(orders)); }
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
  $("estimatedPrice").textContent=money(priceEstimate());
}
function setFile(file){
  if(!file)return;
  const allowed=["application/pdf","image/jpeg","image/png"];
  const ext=file.name.split(".").pop().toLowerCase();
  if(!allowed.includes(file.type)&&!["pdf","jpg","jpeg","png"].includes(ext)){alert("Selecciona un archivo PDF, JPG o PNG.");return}
  if(file.size>15*1024*1024){alert("El archivo supera el límite de 15 MB de esta demostración.");return}
  selectedFile=file;
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

$("requestForm").addEventListener("submit",e=>{
  e.preventDefault();$("formError").textContent="";
  const name=$("customerName").value.trim();
  if(!selectedFile){$("formError").textContent="Primero selecciona el documento que necesitas imprimir.";return}
  if(!name){$("formError").textContent="Escribe tu nombre para identificar la solicitud.";return}
  const folio="CI-"+Date.now().toString().slice(-6);
  const order={folio,name,phone:$("customerPhone").value.trim(),fileName:selectedFile.name,fileSize:selectedFile.size,color:currentColor(),paper:$("paperSize").value,pages:Number($("pages").value)||1,copies,notes:$("notes").value.trim(),estimate:priceEstimate(),status:"Pendiente",createdAt:new Date().toISOString()};
  orders.unshift(order);saveOrders();
  $("newFolio").textContent=folio;$("successModal").classList.remove("hidden");
  renderAdmin();
  // El prototipo guarda metadatos solamente. El archivo no se sube ni se conserva.
});
$("closeModal").onclick=()=>{$("successModal").classList.add("hidden");$("requestForm").reset();selectedFile=null;copies=1;$("fileTitle").textContent="Toca para seleccionar tu archivo";$("fileSub").textContent="PDF, JPG o PNG · Máximo 15 MB en esta demostración";updateSummary()};
$("successModal").addEventListener("click",e=>{if(e.target===$("successModal"))$("successModal").classList.add("hidden")});

function showAdmin(){ $("clientView").classList.add("hidden");$("adminView").classList.remove("hidden");renderAdmin();window.scrollTo(0,0)}
function showClient(){ $("adminView").classList.add("hidden");$("clientView").classList.remove("hidden");window.scrollTo(0,0)}
$("adminToggle").onclick=showAdmin;$("backClient").onclick=showClient;

function renderAdmin(){
  $("statTotal").textContent=orders.length;
  $("statPending").textContent=orders.filter(o=>o.status==="Pendiente").length;
  $("statProcess").textContent=orders.filter(o=>["En revisión","Autorizado","Pagado","En impresión"].includes(o.status)).length;
  $("statDone").textContent=orders.filter(o=>["Entregado","Impreso"].includes(o.status)).length;
  const host=$("ordersList");
  if(!orders.length){host.innerHTML='<div class="empty-orders">Todavía no hay solicitudes. Los pedidos de prueba aparecerán aquí.</div>';return}
  host.innerHTML=orders.map(o=>`<article class="order-item"><div class="order-main"><strong>${safeText(o.folio)} · ${safeText(o.name)}</strong><small>${new Date(o.createdAt).toLocaleString("es-MX")}</small><div class="order-meta">Archivo: ${safeText(o.fileName)} (${(o.fileSize/1024/1024).toFixed(2)} MB)<br>${o.color==="color"?"A color":"Blanco y negro"} · ${o.paper==="oficio"?"Oficio":"Carta"} · ${o.pages} página(s) × ${o.copies} copia(s)<br>Estimado: ${money(o.estimate)}${o.phone?" · Tel. "+safeText(o.phone):""}${o.notes?"<br>Nota: "+safeText(o.notes):""}</div></div><div class="order-actions"><select aria-label="Estado de ${safeText(o.folio)}" data-status="${safeText(o.folio)}">${["Pendiente","En revisión","Autorizado","Pagado","En impresión","Impreso","Entregado","Rechazado","Cancelado"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select><button type="button" data-delete="${safeText(o.folio)}">Eliminar</button></div></article>`).join("");
  host.querySelectorAll("[data-status]").forEach(el=>el.addEventListener("change",()=>{const o=orders.find(x=>x.folio===el.dataset.status);if(o){o.status=el.value;saveOrders();renderAdmin()}}));
  host.querySelectorAll("[data-delete]").forEach(el=>el.addEventListener("click",()=>{if(confirm("¿Eliminar esta solicitud de demostración?")){orders=orders.filter(x=>x.folio!==el.dataset.delete);saveOrders();renderAdmin()}}));
}
function renderRates(){$("rateBn").value=rates.bn;$("rateColor").value=rates.color;$("rateLegal").value=rates.legal}
$("saveRates").onclick=()=>{
  const bn=Number($("rateBn").value),color=Number($("rateColor").value),legal=Number($("rateLegal").value);
  if([bn,color,legal].some(n=>!Number.isFinite(n)||n<0)){alert("Ingresa tarifas válidas, iguales o mayores a cero.");return}
  rates={bn,color,legal};localStorage.setItem(RATE_KEY,JSON.stringify(rates));updateSummary();alert("Tarifas de demostración guardadas en este navegador.");
};
$("exportOrders").onclick=()=>{
  if(!orders.length){alert("Todavía no hay solicitudes para exportar.");return}
  const cols=["Folio","Fecha","Nombre","Teléfono","Archivo","Tipo","Tamaño","Páginas","Copias","Estimado","Estado","Notas"];
  const rows=orders.map(o=>[o.folio,o.createdAt,o.name,o.phone,o.fileName,o.color,o.paper,o.pages,o.copies,o.estimate,o.status,o.notes]);
  const csv=[cols,...rows].map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\r\n");
  const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="solicitudes-centro-impresion.csv";a.click();URL.revokeObjectURL(a.href);
};
$("year").textContent=new Date().getFullYear();
renderRates();updateSummary();renderAdmin();
