const fetch = require('node-fetch');
const { sendQuotaNotification } = require('./emailService');

// Variable pour éviter d'envoyer trop de notifications
let lastQuotaAlertTime = 0;
const QUOTA_ALERT_COOLDOWN = 24 * 60 * 60 * 1000; // 24 heures en millisecondes

async function getGeminiResponse(message) {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error('❌ Clé API Gemini non configurée');
    return "L'API Gemini n'est pas configurée. Veuillez contacter l'administrateur.";
  }

  const prompt = `Tu es l'assistant virtuel de Samaké DELAMOU, un étudiant en informatique L3 à l'Université de Labé, passionné par la data science et l'intelligence artificielle.

Informations sur Samaké DELAMOU :
- Nom complet : Samaké DELAMOU
- Formation : Étudiant en informatique L3 à l'Université de Labé
- Passion : Data science, analyse de données, intelligence artificielle
- Compétences : Python, Machine Learning, Deep Learning, SQL, Git, Data Visualization
- Projets : Modélisation prédictive, NLP, vision par ordinateur, visualisation de données
- Contact : samakedelamou858@gmail.com
- Portfolio : Disponible sur son site web

Réponds aux questions des visiteurs sur Samaké DELAMOU de manière professionnelle et amicale. Si la question ne concerne pas Samaké, redirige poliment vers des informations pertinentes.

Question du visiteur : ${message}

Réponse (en français) :`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt
                }
              ]
            }
          ]
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur API Gemini - Status:', response.status, 'Error:', errorText);

      // Détecter les erreurs de quota (429 ou messages contenant "quota")
      const isQuotaError = response.status === 429 ||
                           errorText.toLowerCase().includes('quota') ||
                           errorText.toLowerCase().includes('limit') ||
                           errorText.toLowerCase().includes('exceeded');

      if (isQuotaError) {
        const now = Date.now();
        // Envoyer notification seulement si 24h se sont écoulées depuis la dernière
        if (now - lastQuotaAlertTime > QUOTA_ALERT_COOLDOWN) {
          lastQuotaAlertTime = now;
          await sendQuotaNotification({
            apiName: 'Google Gemini API',
            errorMessage: `Status: ${response.status} - ${errorText}`
          });
        }
      }

      return "Désolé, une erreur s'est produite lors du traitement de votre message.";
    }

    const data = await response.json();
    const botResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "Je n'ai pas pu générer de réponse.";

    return botResponse.trim();
  } catch (error) {
    console.error('❌ Erreur lors de l\'appel à l\'API Gemini:', error);
    return "Désolé, une erreur s'est produite. Veuillez réessayer plus tard.";
  }
}

module.exports = {
  getGeminiResponse,
};
