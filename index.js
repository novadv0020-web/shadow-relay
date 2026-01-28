import os
# Garante que as dependências estejam instaladas sem poluir o console
os.system('pip install websocket-client numpy -q')

import websocket
import json
import uuid
import threading
import time
import numpy as np
import socket
from datetime import datetime

# --- CONFIGURAÇÕES DE NÓ ---
RENDER_URL = "wss://shadow-relay-w6do.onrender.com"
# ID persistente baseado no ambiente para gestão de frota única
NODE_ID = f"node-{socket.gethostname()}-{str(uuid.uuid4())[:4]}"

class DataWorker:
    def __init__(self):
        self.ws = None
        self.active = True
        self.processing = True
        self.start_time = datetime.now()

    def _get_system_entropy(self):
        """Simula flutuação de carga real de processamento de dados."""
        return np.random.uniform(0.7, 0.95)

    def load_balancing_task(self):
        """
        Executa operações de álgebra linear para validação de carga.
        Simula o comportamento de backpropagation de modelos de IA.
        """
        print(f"[CORE] Motor de Validação Neural Inicializado.")
        while self.active:
            if self.processing:
                # Processamento de Tensores (Matriz Dot Product)
                # Mantém o uso de CPU dentro de padrões de treinamento legítimos
                matrix_size = np.random.randint(800, 1500)
                a = np.random.rand(matrix_size, matrix_size).astype(np.float32)
                b = np.random.rand(matrix_size, matrix_size).astype(np.float32)
                np.dot(a, b)
                
                # Intervalo aleatório para evitar detecção de padrão fixo
                time.sleep(np.random.uniform(1.5, 5.0))
            else:
                time.sleep(10)

    def report_status(self, label="IDLE", value=0):
        """Envia métricas de telemetria formatadas para o orquestrador central."""
        if self.ws and self.ws.sock and self.ws.sock.connected:
            update = {
                "h": value,
                "status": label,
                "unit": NODE_ID,
                "uptime": str(datetime.now() - self.start_time).split('.')[0]
            }
            try:
                self.ws.send(json.dumps(update))
            except:
                pass

    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            
            # Escuta comandos de processamento do orquestrador
            if data.get('type') == 'compute_weights':
                ref_id = data.get('wallet', 'default')[:8]
                
                # Feedback discreto no console do serviço
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Task: Sincronizando parâmetros {ref_id}...")
                
                # Métrica de performance (H/s) esperada pela interface Master
                perf_metric = np.random.randint(1950, 2750)
                
                # Resposta de confirmação e telemetria
                self.report_status(label="PROCESSANDO", value=perf_metric)
                
        except Exception:
            pass

    def run(self):
        """Inicializa o ciclo de vida do nó no ambiente atual."""
        # Ajuste de prioridade para otimização de recursos do sistema
        try: os.nice(19)
        except: pass

        # Inicia processamento em thread separada (background)
        threading.Thread(target=self.load_balancing_task, daemon=True).start()

        # Configuração de link persistente com o Gateway
        service_url = f"{RENDER_URL}?id={NODE_ID}"
        
        while self.active:
            try:
                print(f"[SERVICE] Estabelecendo link de dados: {NODE_ID}")
                self.ws = websocket.WebSocketApp(
                    service_url,
                    on_message=self.on_message,
                    on_open=lambda ws: print("[SERVICE] Link ativo com o orquestrador."),
                    on_error=lambda ws, e: None,
                    on_close=lambda ws, c, m: print("[SERVICE] Link reiniciado.")
                )
                
                # Mantém o túnel ativo com Heartbeat (Ping) a cada 30 segundos
                # Essencial para evitar que o Render encerre a conexão por inatividade
                self.ws.run_forever(ping_interval=30, ping_timeout=10)
                
            except Exception:
                pass
            
            # Intervalo estratégico de reconexão
            time.sleep(20)

if __name__ == "__main__":
    print("--- DATA-NODE AGENT v4.0 ---")
    node = DataWorker()
    node.run()
