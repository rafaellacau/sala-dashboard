# Orquestador de flujo de trabajo IA

Este espacio está pensado para organizar un flujo de trabajo donde:
- Claude o Codex hacen la planificación y el razonamiento de alto nivel.
- NVIDIA se usa para ejecutar tareas más concretas y de bajo costo.
- Tú revisas el resultado antes de confirmar o hacer push.

## Estructura

- `prompts/` : plantillas de prompts para planificación y ejecución.
- `templates/` : ejemplos de estructura de tareas y entregables.
- `scripts/` : herramientas auxiliares para ejecutar el flujo.
- `notes/` : apuntes del proceso y decisiones.

## Flujo recomendado

1. Planificación
   - definir objetivo, alcance y restricciones.
2. Tarea ejecutable
   - convertir el plan en una instrucción concreta.
3. Ejecución
   - usar NVIDIA para implementar la tarea.
4. Revisión
   - revisar el resultado y validar si está listo.
5. Confirmación
   - hacer push o seguir con la siguiente tarea.
