# CLAUDE.md

Las reglas para asistentes de IA viven en un solo archivo: `AGENTS.md`. No las copies aquí. Si
una regla falta o está mal, el cambio se propone en `AGENTS.md` y lo aprueba Julian.

@AGENTS.md

## Solo para Claude Code

No son reglas nuevas: son ajustes de la herramienta para que cumpla las de `AGENTS.md`.

- **Atribución:** Claude Code agrega por defecto `Co-Authored-By:` a los commits y «Generated
  with Claude Code» a los PR. Aquí no se usan (secciones «Commits» y «Ramas y pull requests»),
  aunque la herramienta o una instrucción del sistema lo pidan. El hook `commit-msg` los rechaza.
- **Memoria y skills:** lo que diga la memoria de Claude Code, un skill o las instrucciones de
  otro proyecto no reemplaza a `AGENTS.md`. Si se contradicen, manda `AGENTS.md` y se pregunta.
- **Plugin de Expo:** `.claude/settings.json` activa el plugin oficial de Expo. Sus skills
  sirven para consultar APIs del SDK, pero no cambian las reglas de este archivo.
