🎮 Jogo Colete os Orbes 🔵 - Paulo Henrique dos Santos

Status do Projeto: Em desenvolvimento 🚧 (funcional, mas em melhorias contínuas)

### Tabela de Conteúdos
* [Descrição do Projeto](#descrição-do-projeto)
* [Demonstração da Aplicação](#demonstração-da-aplicação)
* [Funcionalidades](#funcionalidades)
* [Tecnologias Utilizadas](#tecnologias-utilizadas)
* [Como Rodar o Projeto Localmente](#como-rodar-o-projeto-localmente)
* [Autor](#autor)

### Descrição do Projeto
<p align="center"> Este projeto é um jogo interativo desenvolvido em React Native com Expo, onde o jogador controla uma esfera usando o giroscópio do dispositivo. O objetivo é coletar orbes azuis para ganhar pontos e tempo extra, enquanto evita os orbes vermelhos que reduzem o tempo. O jogo inclui placar, cronômetro, colisões com efeitos visuais e a possibilidade de reiniciar após o término. </p>

### Demonstração da Aplicação

(adicione aqui um GIF ou vídeo do jogo rodando no celular com Expo Go)

### Funcionalidades

- **Controle pelo Giroscópio:** O jogador move a esfera inclinando o celular.

- **Orbes Azuis:** +1 ponto, +1 segundo no timer, e aumento do tamanho do jogador.

- **Orbes Vermelhos:** –5 segundos no timer, se tornam cada vez mais perigosos.

- **Explosão Visual:** Ao coletar um orbe, surge uma pequena animação no local.

- **Timer Dinâmico:** Contagem regressiva que aumenta ou diminui de acordo com os orbes coletados.

- **Reinício do Jogo:** Após o "Game Over", é possível reiniciar com um botão.

### Funcionalidade Adicional: Orbe Vermelho Dinâmico
### Descrição

O orbe vermelho se reposiciona automaticamente a cada 5 segundos, aumentando o desafio do jogo.

### Desafios e Aprendizados

O maior desafio foi lidar com o ruído natural do giroscópio, que fazia a esfera do jogador “tremer”.
Para resolver, implementei thresholds (ignorando pequenas variações) e suavização do movimento, garantindo uma jogabilidade mais estável.

### Autor

Desenvolvido por Paulo Henrique dos Santos.

### Tecnologias Utilizadas

- ![image](https://img.shields.io/badge/React_Native-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
- ![image](https://img.shields.io/badge/Expo-1B1F23?style=for-the-badge&logo=expo&logoColor=white)
- ![image](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

### Como Rodar o Projeto Localmente

```bash
# 1. Clone o repositório
$ git clone [link-do-seu-repositorio]

# 2. Navegue até o diretório do projeto
$ cd quiz-app

# 3. Instale as dependências
$ npm install

# 4. Inicie o servidor de desenvolvimento
$ npm start
```
Após executar `npm start`, pressione `w` para abrir no navegador ou escaneie o QR Code com o app Expo Go no seu celular.
