FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1

RUN groupadd --system snmpsim \
    && useradd --system --gid snmpsim \
        --create-home --home-dir /home/snmpsim snmpsim \
   && pip install --no-cache-dir \
    snmpsim==1.2.2 \
    pysmi==2.0.0 \
    cryptography==43.0.3


WORKDIR /opt/snmpsim

COPY --chown=snmpsim:snmpsim data ./data

USER snmpsim

EXPOSE 1161/udp

CMD ["snmpsim-command-responder", "--data-dir=/opt/snmpsim/data", "--agent-udpv4-endpoint=0.0.0.0:1161"]
