SIMULADOR SNMP PARA ZABBIX
==========================

Contenido del paquete:

- compose.yaml
- snmp-simulator/Dockerfile
- snmp-simulator/data/proyecto-snmp.snmprec

INSTALACION
-----------

1. Copie compose.yaml y la carpeta snmp-simulator dentro de la carpeta Zabbix
   del proyecto. Conserve el archivo .env que ya existe en esa carpeta.

2. Abra PowerShell dentro de la carpeta Zabbix y ejecute:

   docker compose up -d --build snmp-switch

3. Verifique que el contenedor este activo:

   docker compose ps

El simulador representa un switch virtual de cuatro puertos. Zabbix debe
consultarlo dentro de la red de Docker usando estos datos:

- Direccion DNS: snmp-switch
- Puerto: 1161
- Version: SNMPv2
- Comunidad: proyecto-snmp

