function setup() {
  noCanvas();
  drawChart();
  window.addEventListener("resize", drawChart);
}

// 🎨 Paire dédiée à la comparaison d'années (2024 → 2025) : distincte du
// petrol (réservé au DT) et du lila+jaune déjà utilisé pour
// Einsatzbetriebe/Einsatzplätze, pour ne pas créer de confusion visuelle
// entre variables différentes.
const COLOR_2024 = "#8A8A8A"; // gris neutre
const COLOR_2025 = "#CAE7EA"; // accent2 — cyan

// --- Formatage suisse : 3'997 ---
function formatSwiss(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, "'");
}

function formatPercent(p) {
  return p.toFixed(1) + " %";
}

function drawChart() {

  d3.select("#chart").selectAll("*").remove();

  const containerWidth = document.getElementById("chart").clientWidth;
  const width = containerWidth;
  const isMobile = width < 600;

  d3.csv("BEZ_Zeitpunkt_Gesuchseinreichung_2025.csv").then(raw => {

    const rows = raw
      .filter(d => d.Year && d.Label)
      .map(d => ({
        year: +d.Year,
        label: d.Label,
        value: +d.Value,
        percent: +d.Percent
      }));

    // Une entrée par catégorie, avec les valeurs 2024 et 2025 associées
    const byLabel = d3.group(rows, d => d.label);
    const data = Array.from(byLabel, ([label, entries]) => {
      const y2024 = entries.find(e => e.year === 2024);
      const y2025 = entries.find(e => e.year === 2025);
      return { label, y2024, y2025 };
    });

    const legendHeight = 46;
    const margin = {
      top: legendHeight + 10,
      right: isMobile ? 60 : 110,
      bottom: 10,
      left: isMobile ? 170 : 380
    };

    const innerWidth = width - margin.left - margin.right;
    const rowHeight = 108;
    const innerHeight = data.length * rowHeight;
    const height = margin.top + innerHeight + margin.bottom;

    const svg = d3.select("#chart")
      .append("svg")
      .attr("width", width)
      .attr("height", height);

    // --- Légende — en haut, avant le graphique ---
    const legend = svg.append("g")
      .attr("transform", `translate(${margin.left}, 6)`);

    [["2024", COLOR_2024], ["2025", COLOR_2025]].forEach(([yr, color], i) => {
      const row = legend.append("g").attr("transform", `translate(${i * 90}, 0)`);
      row.append("circle")
        .attr("cx", 6)
        .attr("cy", 6)
        .attr("r", 6)
        .attr("fill", color)
        .attr("stroke", color === COLOR_2025 ? "#8FB8BC" : "none")
        .attr("stroke-width", 1);
      row.append("text")
        .attr("x", 18)
        .attr("y", 10)
        .style("font-family", "Arial")
        .style("font-size", isMobile ? "11.5px" : "13.5px")
        .style("fill", "#111")
        .text(yr);
    });

    // --- Légende d'unité : juste sous la légende des années, bien visible
    // dès le premier coup d'œil plutôt qu'enterrée en bas du graphique. ---
    legend.append("text")
      .attr("x", 0)
      .attr("y", 34)
      .style("font-family", "Arial")
      .style("font-size", isMobile ? "9px" : "9.5px")
      .style("fill", "#555")
      .text("Anzahl Gesuche / Nombre de demandes / Numero di domande");

    const g = svg.append("g")
      .attr("transform", `translate(${margin.left}, ${margin.top})`);

    const maxVal = d3.max(data, d => Math.max(d.y2024.value, d.y2025.value));

    const x = d3.scaleLinear()
      .domain([0, maxVal * 1.15])
      .range([0, innerWidth]);

    const y = d3.scaleBand()
      .domain(data.map(d => d.label))
      .range([0, innerHeight])
      .padding(0.35);

    data.forEach((d, i) => {
      const rowY = y(d.label) + y.bandwidth() / 2;
      const x24 = x(d.y2024.value);
      const x25 = x(d.y2025.value);
      const xMin = Math.min(x24, x25);
      const xMax = Math.max(x24, x25);

      const row = g.append("g").attr("class", "dumbbell").datum(d);

      // --- Ligne de connexion, apparaît en s'étirant ---
      const line = row.append("line")
        .attr("x1", x24)
        .attr("x2", x24)
        .attr("y1", rowY)
        .attr("y2", rowY)
        .attr("stroke", "#999")
        .attr("stroke-width", 2);

      line.transition()
        .delay(i * 150)
        .duration(700)
        .ease(d3.easeCubicOut)
        .attr("x2", x25);

      // --- Points 2024 / 2025 ---
      const dot24 = row.append("circle")
        .attr("cx", x24)
        .attr("cy", rowY)
        .attr("r", 0)
        .attr("fill", COLOR_2024);

      dot24.transition()
        .delay(i * 150)
        .duration(500)
        .attr("r", 7);

      const dot25 = row.append("circle")
        .attr("cx", x25)
        .attr("cy", rowY)
        .attr("r", 0)
        .attr("fill", COLOR_2025)
        .attr("stroke", "#8FB8BC")
        .attr("stroke-width", 1);

      dot25.transition()
        .delay(i * 150 + 400)
        .duration(500)
        .attr("r", 7);

      // --- Étiquettes de valeur : ancrées vers l'extérieur (celle de gauche
      // s'étend vers la gauche, celle de droite vers la droite) pour ne
      // jamais se chevaucher, même quand les deux points sont très proches.
      const leftIsY24 = x24 <= x25;
      const leftPoint = leftIsY24 ? d.y2024 : d.y2025;
      const rightPoint = leftIsY24 ? d.y2025 : d.y2024;
      const leftDelay = leftIsY24 ? i * 150 + 300 : i * 150 + 700;
      const rightDelay = leftIsY24 ? i * 150 + 700 : i * 150 + 300;

      const leftLabel = row.append("text")
        .attr("x", xMin - 16)
        .attr("y", rowY)
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "end")
        .style("font-family", "Arial")
        .style("font-size", isMobile ? "10.5px" : "12.5px")
        .style("font-weight", "bold")
        .style("fill", "#111")
        .style("opacity", 0)
        .text(`${formatSwiss(leftPoint.value)} (${formatPercent(leftPoint.percent)})`);

      // ⭐ Quand la valeur est petite, le point est tout près de x=0 et cette
      // étiquette (ancrée à gauche du point) peut déborder dans la zone des
      // labels de ligne. On la recale pour qu'elle ne passe jamais à gauche
      // d'une petite marge de sécurité, quitte à s'éloigner un peu du point.
      const leftBBox = leftLabel.node().getBBox();
      if (leftBBox.x < 10) {
        leftLabel.attr("x", (xMin - 16) + (10 - leftBBox.x));
      }

      const rightLabel = row.append("text")
        .attr("x", xMax + 16)
        .attr("y", rowY)
        .attr("dominant-baseline", "middle")
        .attr("text-anchor", "start")
        .style("font-family", "Arial")
        .style("font-size", isMobile ? "10.5px" : "12.5px")
        .style("font-weight", "bold")
        .style("fill", "#111")
        .style("opacity", 0)
        .text(`${formatSwiss(rightPoint.value)} (${formatPercent(rightPoint.percent)})`);

      // ⭐ Quand les deux points sont proches (valeurs voisines, ex. 718 et
      // 808), le recalage ci-dessus peut rapprocher l'étiquette de gauche de
      // celle de droite au point de les faire se chevaucher. On vérifie leur
      // écart réel (mesuré, pas estimé) et on repousse celle de droite si
      // besoin, pour garantir un espacement minimum entre les deux.
      const leftBBoxFinal = leftLabel.node().getBBox();
      const rightBBox = rightLabel.node().getBBox();
      const minGap = 10;
      const neededRightX = leftBBoxFinal.x + leftBBoxFinal.width + minGap;
      if (rightBBox.x < neededRightX) {
        rightLabel.attr("x", (xMax + 16) + (neededRightX - rightBBox.x));
      }

      leftLabel.transition()
        .delay(leftDelay)
        .duration(300)
        .style("opacity", 1);

      rightLabel.transition()
        .delay(rightDelay)
        .duration(300)
        .style("opacity", 1);

      // --- Indicateur d'évolution, sous la ligne ---
      const delta = d.y2025.value - d.y2024.value;
      const deltaPct = d.y2025.percent - d.y2024.percent;
      const deltaSign = delta > 0 ? "+" : delta < 0 ? "−" : "±";
      const deltaPctSign = deltaPct > 0 ? "+" : deltaPct < 0 ? "−" : "±";
      // accent4 (kaki) pour la hausse, accent6 (rouge officiel) pour la baisse
      const deltaColor = delta > 0 ? "#B1B488" : delta < 0 ? "#FF0000" : "#666";

      const deltaText = row.append("text")
        .attr("x", (xMin + xMax) / 2)
        .attr("y", rowY + 24)
        .attr("text-anchor", "middle")
        .style("font-family", "Arial")
        .style("font-size", isMobile ? "10.5px" : "11.5px")
        .style("font-weight", "bold")
        .style("fill", deltaColor)
        .style("opacity", 0)
        .text(`${deltaSign}${formatSwiss(Math.abs(delta))} (${deltaPctSign}${Math.abs(deltaPct).toFixed(1)} pt)`);

      // ⭐ Même logique que pour les étiquettes de valeur : quand les deux
      // points sont proches de l'axe, cet indicateur (centré entre eux)
      // peut déborder dans la zone des labels de ligne à gauche.
      const deltaBBox = deltaText.node().getBBox();
      if (deltaBBox.x < 10) {
        deltaText.attr("x", ((xMin + xMax) / 2) + (10 - deltaBBox.x));
      }

      deltaText.transition()
        .delay(i * 150 + 900)
        .duration(300)
        .style("opacity", 1);

      // --- Label trilingue à gauche ---
      const parts = d.label.split(" / ");
      const labelText = g.append("text")
        .attr("class", "row-label")
        .datum(d)
        .attr("x", -10)
        .attr("y", rowY)
        .attr("text-anchor", "end")
        .style("font-family", "Arial")
        .style("font-size", isMobile ? "11.5px" : "13.5px")
        .style("font-weight", "normal")
        .style("fill", "#333");

      labelText.append("tspan").attr("x", -10).attr("dy", "-0.6em").text(parts[0]);
      labelText.append("tspan").attr("x", -10).attr("dy", "1.2em").text(parts[1]);
      labelText.append("tspan").attr("x", -10).attr("dy", "1.2em").text(parts[2]);
    });

    // --- Survol par ligne : met en évidence une catégorie ---
    function highlight(label) {
      g.selectAll(".dumbbell")
        .transition().duration(150)
        .style("opacity", d => (label === null || d.label === label) ? 1 : 0.3);

      // ⭐ Label survolé : noir plus franc + gras (pas d'agrandissement,
      // pour ne pas risquer de chevaucher les lignes voisines).
      g.selectAll(".row-label")
        .transition().duration(150)
        .style("opacity", d => (label === null || d.label === label) ? 1 : 0.3)
        .style("font-weight", d => (label !== null && d.label === label) ? "bold" : "normal")
        .style("fill", d => (label !== null && d.label === label) ? "#000" : "#333");
    }

    g.selectAll("rect.hit")
      .data(data)
      .enter()
      .append("rect")
      .attr("class", "hit")
      .attr("x", -margin.left)
      .attr("y", d => y(d.label))
      .attr("width", innerWidth + margin.left + margin.right)
      .attr("height", y.bandwidth())
      .attr("fill", "transparent")
      .style("cursor", "pointer")
      .on("mouseover", (event, d) => highlight(d.label))
      .on("mouseout", () => highlight(null));
  });
}
