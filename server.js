const express = require('express');
const cors = require('cors');
const { createClient } = require('redis');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;

// Configuração do Redis via Variáveis de Ambiente do OpenShift
const redisClient = createClient({
    url: `redis://:${process.env.REDIS_PASSWORD}@${process.env.REDIS_HOST}:6379`
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));

app.post('/score', async (req, res) => {
    const { name, score } = req.body;
    if (!name || typeof score !== 'number') {
        return res.status(400).send('Invalid data');
    }
    
    try {
        // ZADD adiciona ao placar. Se o jogador já existir, atualiza se a nova pontuação for maior.
        // Como o ZADD padrão substitui, vamos usar um timestamp no nome se quisermos permitir múltiplas tentativas,
        // ou apenas deixar o jogador melhorar sua própria pontuação.
        await redisClient.zAdd('jatai_leaderboard', { score: score, value: name });
        res.status(200).send({ message: 'Score saved!' });
    } catch (error) {
        res.status(500).send('Error saving score');
    }
});

app.get('/leaderboard', async (req, res) => {
    try {
        // ZREVRANGEBYSCORE pega do maior para o menor. WITHSCORES traz a pontuação junto.
        const results = await redisClient.zRangeWithScores('jatai_leaderboard', 0, 9, { REV: true });
        res.status(200).json(results);
    } catch (error) {
        res.status(500).send('Error fetching leaderboard');
    }
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

redisClient.connect().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend das Jataís rodando na porta ${PORT}`);
    });
});
