# 0001 Dedication Sender Privacy and Live Panel Visibility

Las dedicatorias no anónimas registran el nombre del emisor únicamente para consumo de la banda (administradores), manteniendo el panel en vivo enfocado en el destinatario sin revelar al emisor al resto de los invitados.

## Context
En el flujo de dedicatorias de Canciones Semáforo, los invitados pueden dedicar una canción de forma anónima o identificándose. Existía el dilema de si revelar el nombre de quien dedica en la pantalla pública del evento en vivo.

## Decision
El nombre del emisor (`sender_name`) jamás se expone al público en el feed ni se retorna en la función de base de datos `get_public_dedications`. Solo los administradores autenticados pueden ver la identidad del emisor para interactuar desde el escenario o nombrarlo si corresponde. El panel en vivo siempre muestra al destinatario (`recipient_name`), pero preserva la privacidad del emisor frente a otros invitados.

## Consequences
- Se agrega el campo opcional `sender_name` a la tabla `dedications`.
- La función RPC pública `get_public_dedications` no proyecta `sender_name`, garantizando seguridad y privacidad por diseño.
- En el panel de administración, las dedicatorias firmadas cuentan con un tratamiento visual destacado para que la banda las identifique inmediatamente.
- En la lista de canciones del panel de administración, cada canción con dedicatorias incluye un desplegable para inspeccionarlas en contexto, diferenciando las anónimas con distintivo amarillo.
