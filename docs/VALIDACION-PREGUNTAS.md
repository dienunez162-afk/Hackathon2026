# Validación de las preguntas de G-NOSIS

Banco v2.0: 26 preguntas (6 / 10 / 10 por nivel, 4 de transferencia, solo en nivel 3). Todo sale de `datos/preguntas-mision-lunar.json`.

## Cómo probar con y sin texto
En **herramientas del equipo** está el botón **Prueba: texto oculto** (o abran el juego con `?sintexto=1`). Oculta los textos de lectura de informes, preguntas y llamadas. La línea **Prueba de lectura** cuenta los aciertos al primer intento con texto y sin texto. Si una pregunta se sigue acertando sin texto, se puede adivinar y hay que reescribirla.

## Preguntas que todavía se pueden contestar sin leer (y cómo reescribirlas)
Revisión a mano: con las opciones que ve un niño de cada nivel, ¿se puede acertar con sentido común?

| Pregunta | Por qué se adivina | Propuesta |
|---|---|---|
| Q1-paneles | En nivel 1 solo se ve «Cuando la luz del Sol le llega de frente» contra «Cuando hace frío»: la luz es lo obvio. | Preguntar el dato numérico del mismo informe: «¿Cuántos días seguidos brilla el Sol en la Luna?» (unos 14). |
| Q1-hielo | «Cráteres que nunca reciben Sol» contra «la cima de las montañas»: hielo = frío = sin Sol. | Preguntar la temperatura: «¿A qué temperatura está ese hielo?» (menos de -198 °C) contra -133 °C. Ya existe en nivel 3 (Q3-crater); bajarla a nivel 2. |
| Q2-oxigeno | Algunos niños de 5.° y 6.° ya saben que el agua tiene oxígeno. | Pedir el paso: «¿En qué dos cosas se separa el agua?» (hidrógeno y oxígeno) contra hidrógeno y carbono. |
| Q2-sismo | «Varios minutos» contra «menos de un segundo»: parece razonable que un sismo dure más. | Comparar con la Tierra, que es lo que dice el informe: «¿Duran más o menos que muchos terremotos de la Tierra?». |
| T3-tormenta-noche | La opción segura («ir al refugio igual») se elige por prudencia. | Que todas las opciones sean seguras y cambie la razón: «Ir al refugio porque…» con razones distintas (rayos cósmicos de todas direcciones / el frío / el polvo). |
| T3-calefaccion | «La salud baja con el frío» es sentido común. | Pedir el dato: «¿A qué temperatura baja la noche lunar?» antes de la decisión, o preguntar cuántos días hay que aguantar (14). |
| S-noche_lunar (predice) | «Mañana se oculta el Sol» → energía primero es obvio. | Preguntar sobre todo el **segundo** paso (salud por la calefacción), que sí está solo en el informe. |
| S-energia_solar (predice) | «Los paneles no miran al Sol» → energía es obvio. | Igual: el valor está en el segundo paso (comida por las luces de cultivo). |
| S-salud_astronauta (predice) | Trabajar sin parar → salud, aunque ya no se nombre el cansancio. | Preguntar el segundo paso (energía desperdiciada por errores), que solo dice el informe. |
| Mensaje de la Tierra | Si la situación nombra la barra, la carta de esa barra se elige por descarte. | Usar distractores de la misma barra (ya se ponen primero) y redactar la situación sin nombrar la barra. |

Las demás preguntas dependen de un número, una fecha, un lugar o una causa que solo trae su informe (por ejemplo, 98%, 1 a 3 días, menos de una hora, 20 km por segundo, 2016, polo sur, 8 horas y media).

## TODO: datos por verificar con la NASA
No se agregó ningún dato nuevo de ciencia: todas las respuestas son frases que ya estaban en los informes del juego (`grafo-mision-lunar.json`). Conviene confirmar con la fuente estos, porque ahora son respuestas que el niño tiene que encontrar:
- [ ] Llamaradas: escala en palabras «A, B y C suaves; M y X fuertes; X la más fuerte» (es la que ya explicaba el juego; confirmar la redacción con NASA DONKI).
- [ ] Sismos lunares: «los más fuertes de poca profundidad fueron cerca del polo sur» (Q2-polo).
- [ ] Estación Espacial: «naves de carga cada pocos meses» (Q2-carga).
- [ ] Estación Espacial: «unas 8 horas y media para dormir» (Q2-dormir).
- [ ] Temperaturas: noche lunar «unos -133 °C» y cráteres sombreados «menos de -198 °C» (Q1-frio, Q3-crater).
- [ ] Partículas solares «en menos de una hora» y CME «de 1 a 3 días» (Q2-sep, Q2-cme).

## Preguntas nuevas y modificadas
| id | Nivel | Tipo | Estado | Pregunta | Respuesta | Distractores (del más creíble al menos) | Lectura (informe) |
|---|---|---|---|---|---|---|---|
| Q1-noche | 1 | dato | modificada | ¿Cuánto dura la noche en la Luna? | Unos 14 días | Unos 28 días · Una noche, como en la Tierra · Unos 3 días | F2-D9 |
| Q1-frio | 1 | dato | nueva | ¿A qué temperatura baja la noche lunar? | A unos -133 °C | A menos de -198 °C · A unos 0 °C · A unos 20 °C | N-D11 |
| Q1-paneles | 1 | dato | modificada | ¿Cuándo produce más energía un panel solar? | Cuando la luz del Sol le llega de frente | Cuando hace frío · Cuando tiene regolito encima · De noche, cuando descansa | F1-D1 |
| Q1-refugio | 1 | dato | modificada | ¿Qué frena las partículas de una tormenta solar? | Las paredes más gruesas del refugio | El campo magnético de la Luna · La oscuridad de la noche · El hielo de los cráteres | E-D6 |
| Q1-hielo | 1 | dato | modificada | ¿Dónde hay hielo en la Luna? | En cráteres que nunca reciben Sol | En la cima de las montañas · Bajo los paneles solares · En toda la superficie durante la noche | E-D11 |
| Q1-skylab | 1 | dato | nueva | ¿Cuántas tripulaciones vivieron en Skylab, una tras otra? | Tres | Dos · Catorce · Una | INICIO |
| Q2-polvo | 2 | causa | modificada | ¿Por qué el polvo lunar es filoso como vidrio? | En la Luna no hay viento ni agua que lo desgaste | Lo golpean los micrometeoritos · El frío de la noche lo endurece · La radiación lo afila | F1-D2a |
| Q2-apollo | 2 | dato | nueva | En las misiones Apollo, ¿qué hizo el polvo lunar? | Atascó mecanismos y rasgó trajes | Hizo agujeros por donde se escapó el aire · Apagó los paneles por 14 días · Llenó de moho las plantas | F1-D2a |
| Q2-cme | 2 | dato | modificada | Hoy salió del Sol una nube de material (una CME). ¿En cuánto tiempo suele llegar? | De 1 a 3 días | En menos de una hora · En unos 14 días · En unos 28 días | E-D5 |
| Q2-sep | 2 | dato | nueva | ¿Qué tan rápido pueden llegar las partículas más rápidas de una tormenta solar? | En menos de una hora | De 1 a 3 días · En unos 14 días | E-D6 |
| Q2-agua | 2 | dato | modificada | ¿Cuánta de su agua recicla la Estación Espacial? | Cerca del 98% | Cerca del 50% · Cerca del 9% · Nada: toda llega en naves de carga | E-D7 |
| Q2-oxigeno | 2 | causa | modificada | ¿Cómo se obtiene el oxígeno para respirar? | Separando el agua en hidrógeno y oxígeno | Del regolito que cubre la base · De los paneles solares · Del hielo, sin hacerle nada | E-D7 |
| Q2-sismo | 2 | dato | modificada | ¿Cuánto pueden durar algunos sismos lunares? | Varios minutos | Menos de un segundo · Unos 14 días | E-D12a |
| Q2-polo | 2 | dato | nueva | ¿Dónde fueron los sismos lunares más fuertes de poca profundidad? | Cerca del polo sur | Cerca del ecuador · Donde aterrizó Apollo | F1-D2b |
| Q2-carga | 2 | dato | nueva | ¿Cada cuánto llegan naves de carga a la Estación Espacial? | Cada pocos meses | Cada semana · Una vez al año | R-D8 |
| Q2-dormir | 2 | dato | nueva | ¿Cuánto tiempo tienen programado para dormir los astronautas de la Estación? | Unas 8 horas y media | Unas 14 horas · Unas 4 horas | R-D13 |
| Q3-meteorito | 3 | causa | modificada | ¿Por qué una piedrita del espacio puede hacer un agujero en la base? | Viaja a más de 20 km por segundo | Viaja a unos 20 km por hora · Está a menos de -198 °C · Trae partículas del Sol | E-D8a |
| Q3-campo | 3 | causa | modificada | ¿Por qué en la Luna hay que vigilar la radiación? | No tiene campo magnético ni atmósfera gruesa | Su noche dura unos 14 días · Hay hielo en sus cráteres · Tiene sismos que duran minutos | F1-D4 |
| Q3-moho | 3 | causa | modificada | En 2016, ¿por qué se llenaron de moho unas flores de la Estación Espacial? | Por exceso de agua | Por falta de luz · Por la radiación del Sol · Porque un sismo las movió | E-D8b |
| Q3-noche-rad | 3 | causa | modificada | ¿Llega radiación a la base durante la noche lunar? | Sí: los rayos cósmicos vienen de todas direcciones | No: sin Sol no hay radiación · Solo si hay polvo en el aire · No: el frío la frena | E-D13 |
| Q3-crater | 3 | dato | nueva | ¿A qué temperatura está el hielo de los cráteres sin Sol? | A menos de -198 °C | A unos -133 °C · A unos 0 °C · A unos -20 °C | E-D11 |
| Q3-capas | 3 | dato | nueva | ¿Qué necesita una base que dura meses para aguantar los micrometeoritos? | Paredes con varias capas o cubiertas de regolito | Cerrar las compuertas del refugio · Apagar los aparatos de noche · Limpiar los paneles sin tallar | N-D12a |
| T3-calefaccion | 3 | transferencia | nueva | En la noche lunar apagas la calefacción para ahorrar. ¿Por qué empeora tu barra de SALUD? | Sin calefacción, a unos -133 °C la salud baja rápido | Porque sube la radiación · Porque se caen las cajas de comida · Porque los paneles se rayan | E-D12b |
| T3-tormenta-noche | 3 | transferencia | nueva | ¿Qué harías si la alerta de tormenta solar suena en plena noche lunar? | Ir al refugio igual: protege de día y de noche | Esperar al día: de noche no llega radiación · Limpiar primero los paneles · Prender la calefacción y quedarte afuera | E-D13 |
| T3-fuga | 3 | transferencia | nueva | Una fuga hace que pierdas agua. ¿Por qué también baja tu SALUD? | Con el agua se fabrica el oxígeno para respirar | El agua mueve los paneles · El agua calienta la base de noche · El agua frena el polvo lunar | N-D8a |
| T3-cultivo | 3 | transferencia | nueva | Prender las luces de cultivo baja tu ENERGÍA. ¿Por qué vale la pena? | Gasta energía hoy, pero da comida en los próximos días | Las luces cargan los paneles · Las luces frenan la radiación · Las plantas dan energía esa misma noche | N-D5 |

## Situaciones de las llamadas (modificadas)
| Situación | Texto nivel 1 | Evidencia correcta (está en el informe) | Distractores (hechos reales de otros eventos) |
|---|---|---|---|
| S-radiacion | Control de Misión vio una explosión en el Sol. | Una tormenta solar lanza partículas con mucha energía: eso es la radiación. | La noche lunar dura unos 14 días. · Los micrometeoritos viajan a más de 20 km por segundo. · Algunos sismos lunares duran varios minutos. |
| S-polvo_lunar | Pasó una nube gris sobre la base. | El regolito tapa la luz que llega a los paneles. | Los micrometeoritos viajan a más de 20 km por segundo. · La noche lunar dura unos 14 días. · Las partículas más rápidas de una tormenta solar pueden llegar en menos de una hora. |
| S-sismos | ¡Está temblando! | Lo que no está asegurado se cae, como las cajas de comida de los estantes. | Los micrometeoritos viajan a más de 20 km por segundo. · El polvo lunar es filoso como vidrio. · La noche lunar dura unos 14 días. |
| S-micrometeoritos | ¡Piedritas del espacio golpean la base! | pueden romper un panel o hacer un agujero por donde se escapa el aire. | El polvo lunar es filoso como vidrio. · Algunos sismos lunares duran varios minutos. · Las partículas más rápidas de una tormenta solar pueden llegar en menos de una hora. |
| S-noche_lunar | Mañana se oculta el Sol. | Los paneles dejan de producir y la calefacción gasta energía para cuidar tu salud. | El polvo lunar es filoso como vidrio. · Los paneles producen más energía cuando la luz del Sol les llega de frente. · Las partículas más rápidas de una tormenta solar pueden llegar en menos de una hora. |
| S-hielo_agua | ¡El rover encontró hielo! | Ahí no hay luz, así que el rover no puede recargar sus baterías. | La Estación Espacial recicla cerca del 98% de su agua. · La noche lunar dura unos 14 días. · Los paneles producen más energía cuando la luz del Sol les llega de frente. |
| S-invernadero | La comida está bajando. | La luz gasta energía hoy, y las plantas dan comida en los próximos días. | La Estación Espacial recicla cerca del 98% de su agua. · Los paneles producen más energía cuando la luz del Sol les llega de frente. · La noche lunar dura unos 14 días. |
| S-agua_reciclaje | ¡Hay agua en el piso! | Con el agua también se fabrica oxígeno: si se pierde agua, falta para respirar. | Cultivar gasta energía hoy, pero da comida en los próximos días. · En cráteres que nunca reciben Sol hay hielo. · Algunos sismos lunares duran varios minutos. |
| S-energia_solar | Los paneles no miran al Sol. | Si no mira al Sol, le llega menos luz y produce menos. | El polvo lunar es filoso como vidrio. · La noche lunar dura unos 14 días. · Los micrometeoritos viajan a más de 20 km por segundo. |
| S-salud_astronauta | Llevas varios días trabajando sin parar. | Un astronauta cansado comete más errores, y los errores dañan la base. | La noche lunar dura unos 14 días. · Las partículas más rápidas de una tormenta solar pueden llegar en menos de una hora. · Cultivar gasta energía hoy, pero da comida en los próximos días. |
