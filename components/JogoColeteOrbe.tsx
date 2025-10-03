import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, View, Dimensions, Text, TouchableOpacity, Animated, Easing } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { FontAwesome } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

const BLUE_ORB_SIZE = 30;
const RED_ORB_SIZE = 60;
const INITIAL_PLAYER_SIZE = 50;
const INITIAL_TIME = 15;

// Configuração do movimento
const SPEED = 30;
const THRESHOLD = 0.05;   // ignora tremores pequenos
const SMOOTHING = 0.2;    // suavização leve

// Regras de distância/evitação
const MIN_DISTANCE = RED_ORB_SIZE / 2 + BLUE_ORB_SIZE / 2 + 40; // distância mínima entre centros
const HORIZONTAL_GAP = RED_ORB_SIZE; // se estiver horizontalmente próxima da bomba, evita spawnear abaixo

// Gera posição aleatória dentro da tela (ajusta pelo tamanho do orb)
const generateRandomPosition = (orbSize) => ({
  x: Math.random() * Math.max(0, width - orbSize),
  y: Math.random() * Math.max(0, height - orbSize),
});

// calcula distância entre centros
const distBetweenCenters = (a, aSize, b, bSize) => {
  const ax = a.x + aSize / 2;
  const ay = a.y + aSize / 2;
  const bx = b.x + bSize / 2;
  const by = b.y + bSize / 2;
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
};

// 🔹 Componente da Bomba Pulsante
const Bomb = ({ x, y, size }) => {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, {
          toValue: 1.15,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 1,
          duration: 600,
          easing: Easing.ease,
          useNativeDriver: true,
        }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: [{ scale }],
      }}
    >
      <FontAwesome name="bomb" size={size} color="#e74c3c" />
    </Animated.View>
  );
};

export default function JogoColeteOrbe() {
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  const [playerSize, setPlayerSize] = useState(INITIAL_PLAYER_SIZE);
  const [playerPosition, setPlayerPosition] = useState(() => ({
    x: (width - INITIAL_PLAYER_SIZE) / 2,
    y: (height - INITIAL_PLAYER_SIZE) / 2,
  }));
  const [redOrb, setRedOrb] = useState(generateRandomPosition(RED_ORB_SIZE));
  const [blueOrb, setBlueOrb] = useState(() => generateRandomPosition(BLUE_ORB_SIZE));
  const [score, setScore] = useState(0);
  const [explosion, setExplosion] = useState(null); // {x, y, type, size}
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [gameOver, setGameOver] = useState(false);

  const explosionTimeoutRef = useRef(null);
  const redTeleportIntervalRef = useRef(null);

  // Gera posição para a azul evitando a bomba (evita abaixo / muito perto)
  const generateBluePositionAvoidingBomb = (currentRed) => {
    // tentativa limitada para evitar loop infinito
    for (let i = 0; i < 100; i++) {
      const candidate = generateRandomPosition(BLUE_ORB_SIZE);

      // regra 1: distância circular mínima
      const distance = distBetweenCenters(candidate, BLUE_ORB_SIZE, currentRed, RED_ORB_SIZE);
      if (distance < MIN_DISTANCE) continue; // muito perto -> rejeita

      // regra 2: não ficar **abaixo** da bomba se estiver muito alinhado no X (evita spawn "embaixo")
      const candidateCenterX = candidate.x + BLUE_ORB_SIZE / 2;
      const redCenterX = currentRed.x + RED_ORB_SIZE / 2;
      const candidateCenterY = candidate.y + BLUE_ORB_SIZE / 2;
      const redCenterY = currentRed.y + RED_ORB_SIZE / 2;

      const horizontallyClose = Math.abs(candidateCenterX - redCenterX) < HORIZONTAL_GAP;
      const isBelow = candidateCenterY > redCenterY;
      if (horizontallyClose && isBelow) continue; // rejeita se estiver abaixo e muito alinhada

      // passou nas checagens -> usa esse candidato
      return candidate;
    }

    // se não encontrou em 100 tentativas, retorna um candidato sem garantia (fallback)
    return generateRandomPosition(BLUE_ORB_SIZE);
  };

  // Reinicia jogo (gera bomba primeiro, depois azul evitando bomba)
  const resetGame = () => {
    if (explosionTimeoutRef.current) clearTimeout(explosionTimeoutRef.current);
    if (redTeleportIntervalRef.current) clearInterval(redTeleportIntervalRef.current);

    setPlayerSize(INITIAL_PLAYER_SIZE);
    setPlayerPosition({
      x: (width - INITIAL_PLAYER_SIZE) / 2,
      y: (height - INITIAL_PLAYER_SIZE) / 2,
    });

    const newRed = generateRandomPosition(RED_ORB_SIZE);
    setRedOrb(newRed);
    setBlueOrb(generateBluePositionAvoidingBomb(newRed)); // garante separação no começo

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

  // Movimento do jogador (com threshold e suavização leve)
  useEffect(() => {
    if (gameOver) return;

    setPlayerPosition((prev) => {
      // ignora tremores pequenos
      const deltaX = Math.abs(data.y) > THRESHOLD ? data.y * SPEED : 0;
      const deltaY = Math.abs(data.x) > THRESHOLD ? data.x * SPEED : 0;

      const newX = prev.x + deltaX * SMOOTHING;
      const newY = prev.y + deltaY * SMOOTHING;

      return {
        x: Math.max(0, Math.min(width - playerSize, newX)),
        y: Math.max(0, Math.min(height - playerSize, newY)),
      };
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

  // Bomba (redOrb) muda de lugar a cada 5 segundos
  useEffect(() => {
    if (gameOver) return;

    // cria novo red e reposiciona blue se necessário
    redTeleportIntervalRef.current = setInterval(() => {
      const newRed = generateRandomPosition(RED_ORB_SIZE);
      setRedOrb(newRed);

      // se a azul estiver muito perto/embaixo do novo red, reposiciona-a
      setBlueOrb((currentBlue) => {
        const d = distBetweenCenters(currentBlue, BLUE_ORB_SIZE, newRed, RED_ORB_SIZE);
        const candidateCenterX = currentBlue.x + BLUE_ORB_SIZE / 2;
        const newRedCenterX = newRed.x + RED_ORB_SIZE / 2;
        const candidateCenterY = currentBlue.y + BLUE_ORB_SIZE / 2;
        const newRedCenterY = newRed.y + RED_ORB_SIZE / 2;
        const horizontallyClose = Math.abs(candidateCenterX - newRedCenterX) < HORIZONTAL_GAP;
        const isBelow = candidateCenterY > newRedCenterY;

        if (d < MIN_DISTANCE || (horizontallyClose && isBelow)) {
          return generateBluePositionAvoidingBomb(newRed);
        }
        return currentBlue;
      });
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
    if (!orb) return false;

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
        // gera azul em posição segura em relação à bomba atual
        setBlueOrb(generateBluePositionAvoidingBomb(redOrb));
      } else {
        setTimeLeft((prev) => Math.max(prev - 5, 0));
        // quando coletar a bomba (caso queira permitir coletar), reposiciona bomba
        setRedOrb(generateRandomPosition(RED_ORB_SIZE));
        // garante que a azul não esteja agora em cima da nova bomba (reposiciona se preciso)
        setBlueOrb((curr) => {
          const d = distBetweenCenters(curr, BLUE_ORB_SIZE, redOrb, RED_ORB_SIZE);
          if (d < MIN_DISTANCE) return generateBluePositionAvoidingBomb(redOrb);
          return curr;
        });
      }

      spawnExplosion(orb.x, orb.y, type, orbSize);
      return true;
    }
    return false;
  };

  // Checa colisões
  useEffect(() => {
    if (gameOver) return;
    checkCollision(blueOrb, 'blue', BLUE_ORB_SIZE);
    checkCollision(redOrb, 'red', RED_ORB_SIZE);
  }, [playerPosition, blueOrb, redOrb, playerSize, gameOver]);

  // Ao montar, garante que azul não esteja numa posição inválida em relação à bomba inicial
  useEffect(() => {
    const d = distBetweenCenters(blueOrb, BLUE_ORB_SIZE, redOrb, RED_ORB_SIZE);
    const blueCenterX = blueOrb.x + BLUE_ORB_SIZE / 2;
    const redCenterX = redOrb.x + RED_ORB_SIZE / 2;
    const blueCenterY = blueOrb.y + BLUE_ORB_SIZE / 2;
    const redCenterY = redOrb.y + RED_ORB_SIZE / 2;
    const horizontallyClose = Math.abs(blueCenterX - redCenterX) < HORIZONTAL_GAP;
    const isBelow = blueCenterY > redCenterY;

    if (d < MIN_DISTANCE || (horizontallyClose && isBelow)) {
      setBlueOrb(generateBluePositionAvoidingBomb(redOrb));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // roda apenas no mount

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
        Colete os azuis (+1s, +ponto), evite as bombas (-5s)!
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

          {/* Bomba Pulsante */}
          <Bomb x={redOrb.x} y={redOrb.y} size={RED_ORB_SIZE} />

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
                    explosion.type === 'blue' ? 'yellow' : 'orange',
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
    backgroundColor: '#fff', // fundo branco
  },
  instructions: {
    position: 'absolute',
    top: 50,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 16,
    color: '#000',
    paddingHorizontal: 10,
  },
  score: {
    position: 'absolute',
    top: 80,
    left: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  timer: {
    position: 'absolute',
    top: 80,
    right: 10,
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  gameOver: {
    position: 'absolute',
    top: height / 2 - 60,
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 28,
    fontWeight: 'bold',
    color: '#000',
  },
  button: {
    position: 'absolute',
    top: height / 2,
    left: width / 2 - 80,
    backgroundColor: '#000',
    padding: 15,
    borderRadius: 10,
    width: 160,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  player: {
    position: 'absolute',
    backgroundColor: 'coral',
    borderWidth: 2,
    borderColor: '#000',
  },
  orb: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: '#000',
  },
  explosion: {
    position: 'absolute',
    opacity: 0.85,
  },
})