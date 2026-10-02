/* =====================================================
   QUIZ de cultura Santiagueña  -  script.js
   LÓGICA del juego, dividida en módulos:
     1. Preguntas          6. Barra de puntajes (HUD)
     2. Mapa de teclas     7. Pantallas y flujo del juego
     3. Estado del juego   8. Entrada de botones (teclado)
     4. Utilidades         9. Arranque
     5. Sonido
   Flujo: inicio -> cuenta regresiva -> pregunta -> turno de respuesta
          -> resultado -> (siguiente pregunta | festejo) -> inicio
   ===================================================== */


/* ---- 1. PREGUNTAS ----
   Formato: [pregunta, respuesta correcta, respuesta incorrecta].
   Para agregar contenido basta con sumar una línea nueva.
   En cada partida se eligen al azar, sin repetir. */

/*
const Q=[
["¿Cómo se conoce a Santiago del Estero?","Madre de Ciudades","Ciudad Eterna"],
["¿Qué baile típico es muy famoso en Santiago del Estero?","Chacarera","Tango"],
["¿Qué río pasa por la ciudad de Santiago del Estero?","Río Dulce","Río Paraná"],
["¿Qué instrumento no puede faltar en una chacarera?","Bombo legüero","Trompeta"],
["¿Qué localidad santiagueña es famosa por sus termas?","Termas de Río Hondo","Mar del Plata"],
["¿Qué lengua originaria se habla todavía en Santiago del Estero?","Quichua","Mapuche"],
["¿Cuál es la capital de Argentina?","Buenos Aires","Córdoba"],
["¿Cuántos colores tiene el arcoíris?","7","5"],
["¿Cuál es el planeta más grande del sistema solar?","Júpiter","Marte"],
["¿Qué gas necesitamos para respirar?","Oxígeno","Helio"],
["¿Quién pintó la Mona Lisa?","Leonardo da Vinci","Picasso"],
["¿Cuál es el océano más grande del mundo?","Pacífico","Atlántico"],
["¿En qué año se declaró la independencia argentina?","1816","1853"],
["¿Cuál es la montaña más alta de América?","Aconcagua","Fitz Roy"],
["¿Cuántas patas tiene una araña?","8","6"],
["¿Qué país tiene forma de bota?","Italia","Chile"]
];
*/

//LAS PREGUNTAS se cargan desde el archivo preguntas.js.

/* ---- 2. MAPA DE TECLAS ----
   La Pico 2W se comporta como un teclado. Cada letra se traduce a
   [jugador, color]:  b = azul, g = verde, w = blanco.
   Jugador 1: A azul, S verde, D blanco.
   Jugador 2: J azul, K verde, L blanco. */
const MAP={a:[1,'b'],s:[1,'g'],d:[1,'w'],j:[2,'b'],k:[2,'g'],l:[2,'w']};


/* ---- 3. ESTADO DEL JUEGO ----
   state: pantalla actual -> 'title' (inicio), 'cd' (cuenta regresiva),
          'q' (pregunta esperando botón blanco), 'ans' (un jugador responde),
          'fb' (resultado), 'end' (festejo).
   ready: qué jugadores ya presionaron blanco en la pantalla de inicio.
   s:     puntajes.   n: número de pregunta actual.
   pool:  preguntas que todavía no salieron.   cur: pregunta en juego.
   turn:  jugador que ganó el turno de responder.
   timers: temporizadores activos (para poder cancelarlos todos juntos).
   endAt: momento en que apareció el festejo (evita toques accidentales). */
const $=id=>document.getElementById(id), scr=$('screen');
let state='title',ready,s,n,pool,cur,turn,timers=[],endAt=0;


/* ---- 4. UTILIDADES ----
   after(ms, f): ejecuta f después de ms milisegundos y la registra.
   clear():      cancela todos los temporizadores registrados.
   shuffle(a):   devuelve una copia del arreglo mezclada al azar. */
const after=(ms,f)=>timers.push(setTimeout(f,ms));
const clear=()=>{timers.forEach(clearTimeout);timers=[]};
const shuffle=a=>a.map(v=>[Math.random(),v]).sort((x,y)=>x[0]-y[0]).map(x=>x[1]);


/* ---- 5. SONIDO ----
   beep(frecuencia, duración): genera un pitido con la Web Audio API.
   Si el navegador no lo permite, falla en silencio sin romper el juego. */
let ac;
function beep(f,d=.15){
  try{
    ac=ac||new AudioContext();
    const o=ac.createOscillator(),g=ac.createGain();
    o.frequency.value=f;g.gain.value=.15;
    o.connect(g);g.connect(ac.destination);
    o.start();o.stop(ac.currentTime+d)
  }catch(e){}
}


/* ---- 6. BARRA DE PUNTAJES (HUD) ----
   Muestra u oculta la barra superior (oculta en inicio y festejo)
   y actualiza puntajes y número de pregunta ("Desempate" si pasa de 5). */
function hud(){
  $('hud').style.display=state==='title'||state==='end'?'none':'flex';
  $('s1').textContent=s[1];$('s2').textContent=s[2];
  $('info').textContent=n>5?'Desempate':'Pregunta '+n+' / 5'
}


/* ---- 7. PANTALLAS Y FLUJO DEL JUEGO ---- */

/* 7.1 Pantalla de inicio: reinicia todo y espera a los dos jugadores. */
function title(){
  state='title';
  ready={1:false,2:false};
  s={1:0,2:0};
  n=0;
  clear();
  hud();
  draw()
}

/* Dibuja la pantalla de inicio con el estado de cada jugador
   (Jugador 1 a la izquierda, Jugador 2 a la derecha). */
function draw(){
  const st=p=>`<div class="pl ${ready[p]?'on':''}">Jugador ${p}<br>${ready[p]?'¡Listo! ✓':'Esperando...'}</div>`;
  scr.innerHTML=`<h1>QUIZ de cultura Santiagueña</h1><div class="big">Presione botón blanco para comenzar</div><div class="ready">${st(1)}${st(2)}</div>`
}

/* 7.2 Comienzo de partida: mezcla las preguntas y arranca la primera. */
function start(){pool=shuffle(Q);s={1:0,2:0};n=0;next()}

/* 7.3 Siguiente pregunta.
   Termina la partida si ya se jugaron 5 preguntas y hay un ganador
   (o si no quedan preguntas). Si hay empate, sigue con preguntas de
   desempate. Las dos respuestas se mezclan para que la correcta no
   caiga siempre del mismo lado. */
function next(){
  if(n>=5&&(s[1]!==s[2]||!pool.length))return end();
  const [q,ok,bad]=pool.shift();n++;
  const o=shuffle([{t:ok,ok:true},{t:bad,ok:false}]);
  cur={q,b:o[0],g:o[1]};   // b = opción azul, g = opción verde
  countdown(3)
}

/* 7.4 Cuenta regresiva de preparación (3, 2, 1) con la indicación de la regla. */
function countdown(k){
  state='cd';hud();
  scr.innerHTML=`<div class="hint">¡Prepárense! Después de leer la pregunta, el primero en presionar el <b>botón blanco</b> deberá responder.</div><div class="num">${k}</div>`;
  beep(500);
  after(1000,()=>k>1?countdown(k-1):showQ())
}

/* 7.5 Arma el HTML de la pregunta con sus dos opciones
   (azul a la izquierda, verde a la derecha).
   extra: contenido adicional debajo (aviso, barra, resultado).
   rev:   si es true, resalta la correcta y atenúa la incorrecta. */
function qView(extra,rev){
  const o=(c,k)=>`<div class="o ${c}${rev?(cur[c].ok?' good':' dim'):''}"><small>${k}</small>${cur[c].t}</div>`;
  return `<div class="q">${cur.q}</div><div class="opts">${o('b','Botón AZUL')}${o('g','Botón VERDE')}</div>${extra}`
}

/* 7.6 Muestra la pregunta y espera el botón blanco.
   Si pasan 20 segundos sin que nadie lo presione, se saltea la pregunta. */
function showQ(){
  state='q';beep(800,.2);
  scr.innerHTML=qView('<div class="hint">Presionen el botón blanco para responder</div>');
  after(20000,()=>resolve(null,'⏰ Nadie respondió'))
}

/* 7.7 Un jugador presionó blanco primero: se le da el turno.
   Mientras state sea 'ans', las teclas del otro jugador se ignoran.
   Tiene 5 segundos (la barra se vacía con una transición CSS). */
function buzz(p){
  clear();turn=p;state='ans';beep(1000,.2);
  scr.innerHTML=qView(`<div class="turn p${p}">¡Responde el Jugador ${p}!</div><div class="bar"><i></i></div>`);
  after(30,()=>{const i=scr.querySelector('.bar i');if(i)i.style.width='0'});
  after(5000,()=>resolve(null,'⏰ ¡Se acabó el tiempo!'))
}

/* 7.8 Resultado de la pregunta.
   c: color elegido ('b' o 'g'), o null si se acabó el tiempo.
   Suma 1 punto si es correcta, muestra el resultado 2,8 segundos
   y pasa a la siguiente pregunta. */
function resolve(c,msg){
  clear();state='fb';let t=msg;
  if(c){
    if(cur[c].ok){s[turn]++;t=`✅ ¡Correcto! +1 para el Jugador ${turn}`;beep(900,.4)}
    else{t=`❌ Incorrecto, Jugador ${turn}`;beep(200,.4)}
  }else beep(200,.4);
  hud();scr.innerHTML=qView(`<div class="fb">${t}</div>`,true);
  after(2800,next)
}

/* 7.9 Pantalla de festejo.
   Muestra al ganador (o empate) con confeti. A los 7 segundos vuelve
   sola a la pantalla de inicio; antes, el botón blanco también la reinicia. */
function end(){
  clear();state='end';hud();endAt=Date.now();
  const w=s[1]>s[2]?1:s[2]>s[1]?2:0;
  scr.innerHTML=`<div class="trophy">🏆</div><h1>${w?`¡Ganó el Jugador ${w}!`:'¡Empate!'}</h1><div class="fb">Jugador 1: ${s[1]} · Jugador 2: ${s[2]}</div><div class="big">Presione botón blanco para jugar de nuevo</div>`;
  // Confeti: 80 piezas de colores y tiempos al azar, que se eliminan solas.
  for(let i=0;i<80;i++){
    const d=document.createElement('div');d.className='c';
    d.style.cssText=`left:${Math.random()*100}vw;background:hsl(${Math.random()*360},90%,60%);animation-duration:${2+Math.random()*3}s;animation-delay:${Math.random()*2}s`;
    document.body.appendChild(d);setTimeout(()=>d.remove(),7000)
  }
  after(7000,title);   // vuelve al inicio si nadie presiona nada
  beep(600,.2);setTimeout(()=>beep(800,.2),200);setTimeout(()=>beep(1000,.4),400)
}


/* ---- 8. ENTRADA DE BOTONES ----
   press(jugador, color): decide qué hace cada botón según la pantalla.
   - Inicio:  blanco = el jugador está listo; con los dos listos, arranca.
   - Pregunta: blanco = pide el turno (el primero gana).
   - Respuesta: solo el jugador con turno puede usar azul o verde.
   - Festejo: blanco = volver al inicio (tras 1,5 s de espera). */
function press(p,c){
  if(state==='title'&&c==='w'){ready[p]=true;beep(700);draw();if(ready[1]&&ready[2])after(600,start)}
  else if(state==='q'&&c==='w')buzz(p);
  else if(state==='ans'&&p===turn&&(c==='b'||c==='g'))resolve(c);
  else if(state==='end'&&c==='w'&&Date.now()-endAt>1500)title()
}

/* Escucha el teclado (la Pico envía letras). Ignora teclas mantenidas
   (e.repeat) y letras que no pertenecen al juego. */
addEventListener('keydown',e=>{
  if(e.repeat)return;
  const m=MAP[e.key.toLowerCase()];
  if(!m)return;
  e.preventDefault();
  press(m[0],m[1])
});


/* ---- 9. ARRANQUE ----
   Muestra la pantalla de inicio al cargar la página. */
title();
