async function fetchNews() {
  const container = document.getElementById("news-container");
  container.innerHTML = "<p>Fetching cybersecurity news...</p>";

  try {
    // Call your backend endpoint (Flask/FastAPI must serve /api/news)
    const response = await fetch("http://127.0.0.1:8000/api/news");
    const data = await response.json();

    container.innerHTML = "";

    if (!data.articles || data.articles.length === 0) {
      container.innerHTML = "<p>No news available right now.</p>";
      return;
    }

    data.articles.forEach(article => {
      const card = document.createElement("div");
      card.className = "news-card";

      card.innerHTML = `
        <img src="${article.urlToImage ? article.urlToImage : 'https://placehold.co/320x180?text=No+Image'}" alt="News image">

        <h2>${article.title}</h2>
        <p>${article.description || "No description available."}</p>
        <a href="${article.url}" target="_blank">Read more →</a>
      `;
      container.appendChild(card);
    });
  } catch (err) {
    container.innerHTML = `<p style="color:red;">Error fetching news: ${err.message}</p>`;
  }
}




// async function fetchReport() {
//   const container = document.getElementById("news-container");
//   container.innerHTML = "<p>AI.....</p>";

//   try {
//     // Call your backend endpoint (Flask/FastAPI must serve /api/news)
//     const response = await fetch("http://127.0.0.1:8000/api/report");
//     const data = await response.json();

//     container.innerHTML = data['candidates'][0]['content']['parts'][0]['text'];

    
//   } catch (err) {
//     container.innerHTML = `<p style="color:red;">Error fetching AI: ${err.message}</p>`;
//   }
// }

