import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import { Gyroscope } from 'expo-sensors';

const { width, height } = Dimensions.get('window');
const BALL_SIZE = 40;

export default function OrbeFlutuante() {
  // Estado para os dados do giroscópio. Começa com valores zero.
  const [data, setData] = useState({ x: 0, y: 0, z: 0 });
  // Estado para a posição da bola. Começa no centro da tela.
  const [position, setPosition] = useState({ x: width / 2, y: height / 2 });

  useEffect(() => {
    // Configura a taxa de atualização do giroscópio. O valor é em milissegundos. 1000ms dividido por 60fps é aproximadamente 16ms.
    Gyroscope.setUpdateInterval(16);

    // Inscreve-se para receber atualizações do giroscópio. 
    const subscription = Gyroscope.addListener(gyroscopeData => {
      setData(gyroscopeData);
    });
    // Limpa a inscrição quando o componente é desmontado.
    // Isso evita vazamentos de memória.
    return () => subscription && subscription.remove();
  }, [] // Executa apenas uma vez na montagem do componente
  );

  useEffect(() => {
    // Usamos o eixo Y do giroscópio para mover no eixo X da tela
    // e o eixo X do giroscópio para mover no eixo Y da tela.
    // O fator de multiplicação (ex: 100) ajusta a sensibilidade.

    let newX = position.x - data.y * 10;
    let newY = position.y - data.x * 10;

    // Lógica para manter a bola dentro dos limites da tela. 
    if (newX < 0) newX = 0;
    // Se a nova posição X ultrapassar a largura da tela, ajusta para a largura da tela. Veja que subtraímos BALL_SIZE para considerar o tamanho da bola. Exemplo: se a largura da tela é 400 e a bola tem 40, a posição máxima X que a bola pode ter é 360.
    if (newX > width - BALL_SIZE) newX = width - BALL_SIZE;
    // Mesma lógica para o eixo Y.
    if (newY < 0) newY = 0;
    if (newY > height - BALL_SIZE) newY = height - BALL_SIZE;

    setPosition({ x: newX, y: newY });
  }, [data] // Executa sempre que os dados do giroscópio mudam
  );



  return (
    <View style={styles.container}>
      <Text style={styles.text}>Mova o celular!</Text>
      <View
        style={[
          styles.ball,
          {
            left: position.x,
            top: position.y,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    position: 'absolute',
    top: 50,
    fontSize: 18,
  },
  ball: {
    position: 'absolute',
    width: BALL_SIZE,
    height: BALL_SIZE,
    borderRadius: BALL_SIZE / 2,
    backgroundColor: 'coral',
  },
});