@echo on
cd /d %cd%

SET NODE_OPTIONS=--openssl-legacy-provider
set mode=production
call webpack

pause