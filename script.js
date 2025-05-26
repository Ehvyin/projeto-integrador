const map = L.map('map').setView([-23.5505, -46.6333], 13); // São Paulo padrão

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const markers = [];
const buttons = document.querySelectorAll('.buttons button');
const searchInput = document.getElementById('searchInput');
const btnBuscarRegiao = document.getElementById('btnBuscarRegiao');
const sugestoesEl = document.getElementById('sugestoes');
const loadingEl = document.getElementById('loading');

let botaoAtivo = null;

function mostrarLoading() {
  loadingEl.classList.remove('hidden');
}

function esconderLoading() {
  loadingEl.classList.add('hidden');
}

function limparMarcadores() {
  markers.forEach(marker => map.removeLayer(marker));
  markers.length = 0;
}

function buscarLocais(tipo) {
  mostrarLoading();
  limparMarcadores();

  const bounds = map.getBounds();
  let filtro = "";

  switch (tipo) {
    case 'supermarket':
    case 'pharmacy':
    case 'hospital':
    case 'school':
    case 'college':
      filtro = `node["amenity"="${tipo}"]`;
      break;
    case 'pet':
      filtro = `node["shop"="pet"]`;
      break;
    case 'veterinary':
      filtro = `node["amenity"="veterinary"]`;
      break;
    default:
      alert("O mapa será resetado para a posição inicial");
      esconderLoading();
      return;
  }

  const overpassUrl = `https://overpass-api.de/api/interpreter?data=[out:json];
    (
      ${filtro}(${bounds.getSouth()},${bounds.getWest()},${bounds.getNorth()},${bounds.getEast()});
    );
    out body;`;

  fetch(overpassUrl)
    .then(response => response.json())
    .then(data => {
      if (data.elements.length === 0) {
        alert("Nenhum local encontrado.");
      }
      data.elements.forEach(el => {
        if (el.lat && el.lon) {
          const nome = el.tags.name || tipo;
          const marker = L.marker([el.lat, el.lon])
            .addTo(map)
            .bindPopup(`<strong>${nome}</strong><br>Tipo: ${tipo}`);
          markers.push(marker);
        }
      });
      esconderLoading();
    })
    .catch(err => {
      console.error("Erro ao buscar locais:", err);
      alert("Erro na busca dos locais.");
      esconderLoading();
    });
}

// Gerenciar clique nos botões
buttons.forEach(btn => {
  btn.addEventListener('click', () => {
    const tipo = btn.dataset.tipo;

    if (botaoAtivo === btn) {
      // Desativa se clicar no mesmo botão
      btn.classList.remove('ativo');
      botaoAtivo = null;
      limparMarcadores();
    } else {
      // Ativa o novo botão e desativa o anterior
      if (botaoAtivo) botaoAtivo.classList.remove('ativo');
      btn.classList.add('ativo');
      botaoAtivo = btn;
      buscarLocais(tipo);
    }
  });
});

// Buscar região
btnBuscarRegiao.addEventListener('click', buscarRegiao);

function buscarRegiao() {
  const regiao = searchInput.value.trim();
  if (!regiao) return alert("Digite uma região para buscar.");

  mostrarLoading();

  fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(regiao)}`)
    .then(response => response.json())
    .then(data => {
      esconderLoading();
      if (data.length > 0) {
        const { lat, lon } = data[0];
        map.setView([lat, lon], 14);
      } else {
        alert("Região não encontrada.");
      }
    })
    .catch(err => {
      console.error("Erro na busca de região:", err);
      alert("Erro na busca da região.");
      esconderLoading();
    });
}

// Sugestões ao digitar
async function mostrarSugestoes() {
  const valor = searchInput.value.trim();
  if (valor.length < 3) {
    sugestoesEl.classList.add('hidden');
    return;
  }

  try {
    const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(valor + ' São Paulo Brasil')}&limit=5&countrycodes=br`, {
  headers: {
    "User-Agent": "MapaInterativoEstudantil/1.0 (seuemail@exemplo.com)"
  }
});


    const data = await res.json();
    sugestoesEl.innerHTML = "";

    if (data.length === 0) {
      sugestoesEl.classList.add('hidden');
      return;
    }

    data.forEach(item => {
      const li = document.createElement("li");
      li.textContent = item.display_name;
      li.onclick = () => {
        searchInput.value = item.display_name;
        sugestoesEl.classList.add("hidden");
        centralizarMapa(item);
      };
      sugestoesEl.appendChild(li);
    });

    sugestoesEl.classList.remove("hidden");
  } catch (err) {
    console.error("Erro ao buscar sugestões:", err);
  }
}

function centralizarMapa(item) {
  const lat = parseFloat(item.lat);
  const lon = parseFloat(item.lon);
  if (!isNaN(lat) && !isNaN(lon)) {
    map.setView([lat, lon], 14);
  }
}

searchInput.addEventListener('input', mostrarSugestoes);

// Ocultar sugestões ao clicar fora
document.addEventListener("click", (e) => {
  if (!searchInput.contains(e.target) && !sugestoesEl.contains(e.target)) {
    sugestoesEl.classList.add("hidden");
  }
});

function resetarMapa() {
  limparMarcadores();

  // Desativa os botões ativos
  document.querySelectorAll('.buttons button').forEach(btn => {
    btn.classList.remove('ativo');
  });

  // Centraliza o mapa novamente
  map.setView([-23.5505, -46.6333], 13);
}

function atualizarHoraBrasilia() {
  const agora = new Date();
  // Ajuste do fuso horário: Brasília = UTC-3
  const horaBrasilia = new Date(agora.toLocaleString("en-US", { timeZone: "America/Sao_Paulo" }));
  const horas = String(horaBrasilia.getHours()).padStart(2, '0');
  const minutos = String(horaBrasilia.getMinutes()).padStart(2, '0');
  const segundos = String(horaBrasilia.getSeconds()).padStart(2, '0');

  document.getElementById("hora-brasilia").textContent = `${horas}:${minutos}:${segundos}`;
}

// Atualizar a cada segundo
setInterval(atualizarHoraBrasilia, 1000);
atualizarHoraBrasilia(); // Atualiza já na primeira vez


