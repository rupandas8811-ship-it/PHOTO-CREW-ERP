while kill -0 $(cat .esbuild.pid 2>/dev/null || echo 999999) 2>/dev/null; do sleep 1; done
