import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Text, TouchableOpacity } from 'react-native';
import { Gyroscope } from 'expo-sensors';

const { width, height } = Dimensions.get('window');

const BLUE_ORB_SIZE = 30;
const RED_ORB_SIZE = 60;
const INITIAL_PLAYER_SIZE = 50;
const INITIAL_TIME = 15;

// Configuração do movimento
const SPEED = 15; // ajuste a sensibilidade
const THRESHOLD = 0.05; // ignora tremores pequenos

// Gera posição aleatória dentro da tela (ajusta pelo tamanho do orb)
const generateRandomPosition = (orbSize) => ({
  x: Math.random() * (width - orbSize),
  y: Math.random() * (height - orbSize),
});

export default function JogoColeteOrbe() {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [playerSize, setPlayerSize] = useState(INITIAL_PLAYER_SIZE);
  const [playerPosition, setPlayerPosition] = useState(() => ({
    x: (width - INITIAL_PLAYER_SIZE) / 2,
    y: (height - INITIAL_PLAYER_SIZE) / 2,
  }));
  const [blueOrb, setBlueOrb] = useState(generateRandomPosition(BLUE_ORB_SIZE));
  const [redOrb, setRedOrb] = useState(generateRandomPosition(RED_ORB_SIZE));
  const [score, setScore] = useState(0);
  const [explosion, setExplosion] = useState(null); // {x, y, type, size}
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [gameOver, setGameOver] = useState(false);

  const explosionTimeoutRef = useRef(null);
  const redTeleportIntervalRef = useRef(null);

  // Reinicia jogo
  const resetGame = () => {
    if (explosionTimeoutRef.current) clearTimeout(explosionTimeoutRef.current);
    if (redTeleportIntervalRef.current) clearInterval(redTeleportIntervalRef.current);

    setPlayerSize(INITIAL_PLAYER_SIZE);
    setPlayerPosition({
      x: (width - INITIAL_PLAYER_SIZE) / 2,
      y: (height - INITIAL_PLAYER_SIZE) / 2,
    });
    setBlueOrb(generateRandomPosition(BLUE_ORB_SIZE));
    setRedOrb(generateRandomPosition(RED_ORB_SIZE));
    setScore(0);
    setTimeLeft(INITIAL_TIME);
    setGameOver(false);
  };

  // Ativa giroscópio
  useEffect(() => {
    Gyroscope.setUpdateInterval(16);
    const subscription = Gyroscope.addListener(setData);
    return () => subscription.remove();
  }, []);

  // Movimento do jogador
  useEffect(() => {
    if (gameOver) return;

    setPlayerPosition((prev) => {
      // ignora tremores pequenos
      const deltaX = Math.abs(data.y) > THRESHOLD ? data.y * SPEED : 0;
      const deltaY = Math.abs(data.x) > THRESHOLD ? data.x * SPEED : 0;

      let newX = prev.x + deltaX;
      let newY = prev.y + deltaY;

      // mantém dentro da tela
      newX = Math.max(0, Math.min(width - playerSize, newX));
      newY = Math.max(0, Math.min(height - playerSize, newY));

      return { x: newX, y: newY };
    });
  }, [data, playerSize, gameOver]);

  // Timer decrescente
  useEffect(() => {
    if (gameOver) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameOver(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [gameOver]);

  // Orbe vermelho muda de lugar a cada 5 segundos
  useEffect(() => {
    if (gameOver) return;

    redTeleportIntervalRef.current = setInterval(() => {
      setRedOrb(generateRandomPosition(RED_ORB_SIZE));
    }, 5000);

    return () => {
      if (redTeleportIntervalRef.current) {
        clearInterval(redTeleportIntervalRef.current);
        redTeleportIntervalRef.current = null;
      }
    };
  }, [gameOver]);

  // Criar explosão proporcional ao tamanho do orb
  const spawnExplosion = (x, y, type, orbSize) => {
    if (explosionTimeoutRef.current) clearTimeout(explosionTimeoutRef.current);

    setExplosion({ x, y, type, size: orbSize });

    explosionTimeoutRef.current = setTimeout(() => {
      setExplosion(null);
    }, 300);
  };

  // Verifica colisão
  const checkCollision = (orb, type, orbSize) => {
    if (!orb) return;

    const playerCenterX = playerPosition.x + playerSize / 2;
    const playerCenterY = playerPosition.y + playerSize / 2;
    const orbCenterX = orb.x + orbSize / 2;
    const orbCenterY = orb.y + orbSize / 2;

    const dx = playerCenterX - orbCenterX;
    const dy = playerCenterY - orbCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < playerSize / 2 + orbSize / 2) {
      if (type === 'blue') {
        setScore((prev) => prev + 1);
        setTimeLeft((prev) => prev + 1);
        setPlayerSize((prev) => prev + 1);
        setBlueOrb(generateRandomPosition(BLUE_ORB_SIZE));
      } else {
        setTimeLeft((prev) => Math.max(prev - 5, 0));
        setRedOrb(generateRandomPosition(RED_ORB_SIZE));
      }

      spawnExplosion(orb.x, orb.y, type, orbSize);
    }
  };

  // Checa colisões
  useEffect(() => {
    if (gameOver) return;
    checkCollision(blueOrb, 'blue', BLUE_ORB_SIZE);
    checkCollision(redOrb, 'red', RED_ORB_SIZE);
  }, [playerPosition, blueOrb, redOrb, playerSize, gameOver]);

  // Cleanup final
  useEffect(() => {
    return () => {
      if (explosionTimeoutRef.current) clearTimeout(explosionTimeoutRef.current);
      if (redTeleportIntervalRef.current) clearInterval(redTeleportIntervalRef.current);
    };
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.instructions}>
        Colete os azuis (+1s, +ponto), evite os vermelhos (-5s)!
      </Text>
      <Text style={styles.score}>Placar: {score}</Text>
      <Text style={styles.timer}>⏱ {timeLeft}s</Text>

      {gameOver ? (
        <>
          <Text style={styles.gameOver}>🏁 Fim de jogo! Placar final: {score}</Text>
          <TouchableOpacity style={styles.button} onPress={resetGame}>
            <Text style={styles.buttonText}>🔄 Reiniciar</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          {/* Orbe Azul */}
          <View
            style={[
              styles.orb,
              {
                width: BLUE_ORB_SIZE,
                height: BLUE_ORB_SIZE,
                borderRadius: BLUE_ORB_SIZE / 2,
                left: blueOrb.x,
                top: blueOrb.y,
                backgroundColor: '#3498db',
              },
            ]}
          />

          {/* Orbe Vermelho */}
          <View
            style={[
              styles.orb,
              {
                width: RED_ORB_SIZE,
                height: RED_ORB_SIZE,
                borderRadius: RED_ORB_SIZE / 2,
                left: redOrb.x,
                top: redOrb.y,
                backgroundColor: '#e74c3c',
              },
            ]}
          />

          {/* Jogador */}
          <View
            style={[
              styles.player,
              {
                width: playerSize,
                height: playerSize,
                borderRadius: playerSize / 2,
                left: playerPosition.x,
                top: playerPosition.y,
              },
            ]}
          />

          {/* Explosão */}
          {explosion && (
            <View
              style={[
                styles.explosion,
                {
                  width: explosion.size * 1.5,
                  height: explosion.size * 1.5,
                  borderRadius: explosion.size * 0.75,
                  left: explosion.x - explosion.size * 0.25,
                  top: explosion.y - explosion.size * 0.25,
                  backgroundColor:
                    explosion.type === 'blue' ? 'yellow' : 'black',
                },
              ]}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  instructions: {
    position: 'absolute',
    top: 50, // um pouco mais para baixo
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 16,
    color: '#000000',
    paddingHorizontal: 10,
  },
  score: {
    position: 'absolute',
    top: 80, // mais para baixo
    left: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  timer: {
    position: 'absolute',
    top: 80, // mais para baixo
    right: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
  },
  gameOver: {
    position: 'absolute',
    top: height / 2 - 60,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000000',
  },
  button: {
    position: 'absolute',
    top: height / 2,
    left: width / 2 - 80,
    backgroundColor: '#000000',
    padding: 15,
    borderRadius: 10,
    width: 160,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  player: {
    position: 'absolute',
    backgroundColor: 'coral',
    borderWidth: 2,
    borderColor: '#000000',
  },
  orb: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#000000',
  },
  explosion: {
    position: 'absolute',
    opacity: 0.85,
  },
});
