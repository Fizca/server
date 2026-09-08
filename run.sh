#!/bin/bash
# Lambda Web Adapter startup script (function handler = run.sh).
# bootstrap.js loads SSM config into env, then starts the Express app.
exec node bootstrap.js
