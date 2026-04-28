const REGION_SOURCES = {
  "puerto-rico": [
    {
      id: "hurricane-season",
      category: "Clima",
      severity: "Alta",
      title: "Perspectiva tropical del Atlántico",
      fallbackSummary:
        "Monitoreo oficial de ciclones, disturbios y actividad tropical con impacto potencial sobre Puerto Rico y el Caribe.",
      whyItMatters:
        "Afecta generación de leads, cierres, instalaciones, logística y argumentos comerciales de resiliencia.",
      sourceLabel: "NOAA / National Hurricane Center",
      sourceUrl: "https://www.nhc.noaa.gov/gtwo.xml",
      fetchUrl: "https://www.nhc.noaa.gov/gtwo.xml",
      parser: "rss",
    },
    {
      id: "drought-pr",
      category: "Agua",
      severity: "Media",
      title: "Monitor oficial de sequía en Puerto Rico",
      fallbackSummary:
        "Seguimiento oficial de condiciones de sequía, agua y humedad con actualización periódica para Puerto Rico.",
      whyItMatters:
        "Ayuda a priorizar conversaciones de resiliencia hídrica y sistemas de agua por territorio.",
      sourceLabel: "Drought.gov",
      sourceUrl: "https://www.drought.gov/states/puerto-rico/data",
      fetchUrl: "https://www.drought.gov/states/puerto-rico/data",
      parser: "drought-data",
    },
    {
      id: "building-permits",
      category: "Demanda",
      severity: "Media",
      title: "Monthly New Residential Construction",
      fallbackSummary:
        "Publicación oficial sobre permisos residenciales y señales de nueva construcción como proxy de demanda.",
      whyItMatters:
        "Sirve para leer expansión de mercado, remodelaciones y actividad potencial para solar, baterías y agua.",
      sourceLabel: "U.S. Census Bureau",
      sourceUrl: "https://www.census.gov/construction/nrc/current/index.html",
      fetchUrl: "https://www.census.gov/construction/nrc/current/index.html",
      parser: "census-nrc",
    },
    {
      id: "net-metering",
      category: "Regulación",
      severity: "Alta",
      title: "Órdenes y resoluciones del Negociado de Energía",
      fallbackSummary:
        "Detección de documentos regulatorios recientes del Negociado de Energía de Puerto Rico.",
      whyItMatters:
        "Puede alterar tiempos de interconexión, objeciones comerciales, narrativa de valor y monetización de proyectos.",
      sourceLabel: "Puerto Rico Energy Bureau",
      sourceUrl: "https://energia.pr.gov/en/files-dockets/",
      fetchUrl: "https://energia.pr.gov/en/files-dockets/",
      parser: "preb-dockets",
    },
    {
      id: "public-health",
      category: "Operación",
      severity: "Media",
      title: "Vigilancia epidemiológica y ausentismo",
      fallbackSummary:
        "Lectura de la portada oficial del Departamento de Salud para cambios recientes en vigilancia epidemiológica.",
      whyItMatters:
        "Ayuda a ajustar rutas, eventos, canvassing y disponibilidad de líderes y vendedores.",
      sourceLabel: "Departamento de Salud de Puerto Rico",
      sourceUrl: "https://www.salud.pr.gov/",
      fetchUrl: "https://www.salud.pr.gov/",
      parser: "salud-home",
    },
  ],
  florida: [
    {
      id: "hurricane-season",
      category: "Clima",
      severity: "Alta",
      title: "Perspectiva tropical del Atlántico",
      fallbackSummary:
        "Monitoreo oficial de ciclones, disturbios y actividad tropical con impacto potencial sobre Florida y el Caribe.",
      whyItMatters:
        "Afecta cierres, instalación, seguridad de equipo, generación de leads y continuidad comercial en Florida.",
      sourceLabel: "NOAA / National Hurricane Center",
      sourceUrl: "https://www.nhc.noaa.gov/gtwo.xml",
      fetchUrl: "https://www.nhc.noaa.gov/gtwo.xml",
      parser: "rss",
    },
    {
      id: "drought-pr",
      category: "Agua",
      severity: "Media",
      title: "Monitor oficial de sequía en Florida",
      fallbackSummary:
        "Seguimiento oficial de condiciones de sequía y agua para Florida con actualización recurrente.",
      whyItMatters:
        "Ayuda a priorizar agua, resiliencia del hogar y conversaciones territoriales de necesidad inmediata.",
      sourceLabel: "Drought.gov",
      sourceUrl: "https://www.drought.gov/states/florida/data",
      fetchUrl: "https://www.drought.gov/states/florida/data",
      parser: "drought-data",
    },
    {
      id: "building-permits",
      category: "Demanda",
      severity: "Media",
      title: "Monthly New Residential Construction",
      fallbackSummary:
        "Publicación oficial sobre permisos residenciales y señales de nueva construcción como proxy de demanda.",
      whyItMatters:
        "Apoya la lectura de condados con mayor actividad residencial y posible expansión comercial.",
      sourceLabel: "U.S. Census Bureau",
      sourceUrl: "https://www.census.gov/construction/nrc/current/index.html",
      fetchUrl: "https://www.census.gov/construction/nrc/current/index.html",
      parser: "census-nrc",
    },
    {
      id: "net-metering",
      category: "Regulación",
      severity: "Alta",
      title: "Actividad reciente de la Florida Public Service Commission",
      fallbackSummary:
        "Detección de actividad reciente en la biblioteca oficial de órdenes de la comisión regulatoria de Florida.",
      whyItMatters:
        "Sirve para vigilar el entorno regulatorio que puede afectar propuestas de energía, tarifa y timing comercial.",
      sourceLabel: "Florida Public Service Commission",
      sourceUrl: "https://www.psc.state.fl.us/library/Orders/2026/",
      fetchUrl: "https://www.psc.state.fl.us/library/Orders/2026/",
      parser: "florida-psc",
    },
    {
      id: "public-health",
      category: "Operación",
      severity: "Media",
      title: "Arbovirus surveillance en Florida",
      fallbackSummary:
        "Seguimiento oficial de reportes semanales de arbovirus y salud pública operativa en Florida.",
      whyItMatters:
        "Puede afectar ausentismo, visitas de campo, eventos, canvassing y productividad comercial.",
      sourceLabel: "Florida Department of Health",
      sourceUrl:
        "https://www.floridahealth.gov/statistics-data/population-surveillance/arbovirus-surveillance/",
      fetchUrl:
        "https://www.floridahealth.gov/statistics-data/population-surveillance/arbovirus-surveillance/",
      parser: "florida-health",
    },
  ],
};

function decodeEntities(text) {
  return String(text || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(text) {
  return decodeEntities(
    String(text || "")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function asAbsolute(url) {
  if (!url) {
    return "";
  }
  if (/^https?:\/\//i.test(url)) {
    return url;
  }
  if (url.startsWith("/")) {
    return `https://energia.pr.gov${url}`;
  }
  return url;
}

function isoFromUsSlashDate(value) {
  if (!value) {
    return null;
  }
  const parts = value.split("/");
  if (parts.length !== 3) {
    return null;
  }
  const [month, day, year] = parts;
  const fullYear = year.length === 2 ? `20${year}` : year;
  return new Date(`${fullYear}-${month.padStart(2, "0")}-${day.padStart(2, "0")}T00:00:00Z`).toISOString();
}

function isoFromDateLabel(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseRss(text, source) {
  const itemBlock = text.match(/<item>([\s\S]*?)<\/item>/i)?.[1] || "";
  const title = decodeEntities(itemBlock.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || source.title);
  const summary = stripHtml(itemBlock.match(/<description>([\s\S]*?)<\/description>/i)?.[1] || source.fallbackSummary);
  const sourceUrl = decodeEntities(itemBlock.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || source.sourceUrl);
  const publishedAt = isoFromDateLabel(itemBlock.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "");
  return { title, summary, sourceUrl, publishedAt };
}

function parseDroughtData(text, source) {
  const plain = stripHtml(text);
  const dateMatch = plain.match(/Last Update\s+(\d{2}\/\d{2}\/\d{2})/i);
  return {
    title: source.title,
    summary: source.fallbackSummary,
    sourceUrl: source.sourceUrl,
    publishedAt: isoFromUsSlashDate(dateMatch?.[1] || ""),
  };
}

function parseCensusNrc(text, source) {
  const plain = stripHtml(text);
  const title =
    plain.match(/MONTHLY NEW RESIDENTIAL CONSTRUCTION,\s+[A-Z]+\s+\d{4}/i)?.[0] || source.title;
  const summary =
    plain.match(/Building Permits\s+(.+?)\s+Housing Starts/i)?.[1]?.trim() || source.fallbackSummary;
  const publishedAt =
    isoFromDateLabel(plain.match(/([A-Z][a-z]+\s+\d{1,2},\s+\d{4})/i)?.[1] || "") || null;
  return { title, summary, sourceUrl: source.sourceUrl, publishedAt };
}

function parsePrebDockets(text, source) {
  const matches = [...text.matchAll(/href="([^"]*\/(\d{8})[^"]+\.pdf)"/gi)];
  if (!matches.length) {
    return {
      title: source.title,
      summary: source.fallbackSummary,
      sourceUrl: source.sourceUrl,
      publishedAt: null,
    };
  }

  const newest = matches
    .map((match) => ({
      href: asAbsolute(match[1]),
      dateCode: match[2],
    }))
    .sort((a, b) => b.dateCode.localeCompare(a.dateCode))[0];

  const year = newest.dateCode.slice(0, 4);
  const month = newest.dateCode.slice(4, 6);
  const day = newest.dateCode.slice(6, 8);
  return {
    title: source.title,
    summary: "Se detectó un documento regulatorio reciente en el expediente público oficial.",
    sourceUrl: newest.href,
    publishedAt: new Date(`${year}-${month}-${day}T00:00:00Z`).toISOString(),
  };
}

function parseSaludHome(text, source) {
  const plain = stripHtml(text);
  const match = plain.match(
    /(\d{1,2}\s+[A-Za-zÁÉÍÓÚáéíóúñÑ]+\s+\d{4})\s+([^]+?)\s+San Juan, Puerto Rico/i,
  );
  return {
    title: match?.[2]?.trim() || source.title,
    summary: source.fallbackSummary,
    sourceUrl: source.sourceUrl,
    publishedAt: isoFromDateLabel(match?.[1] || ""),
  };
}

function parseFloridaPsc(text, source) {
  const match = text.match(/(\d{1,2}\/\d{1,2}\/\d{4})\s+\d{1,2}:\d{2}\s+(?:AM|PM)[\s\S]*?([0-9-]+\.pdf)/i);
  return {
    title: source.title,
    summary: "Se detectó actividad reciente en la biblioteca oficial de órdenes regulatorias de Florida.",
    sourceUrl: match?.[2] ? `${source.sourceUrl}${match[2]}` : source.sourceUrl,
    publishedAt: isoFromDateLabel(match?.[1] || ""),
  };
}

function parseFloridaHealth(text, source, response) {
  const plain = stripHtml(text);
  const match = plain.match(/Week\s+(\d+)\s+[–-]\s+([A-Za-z]+\s+\d+\s+[–-]\s+\d+)/i);
  const lastModified = response.headers.get("last-modified");
  return {
    title: match ? `Arbovirus Surveillance · Week ${match[1]}` : source.title,
    summary: match
      ? `Reporte semanal oficial de arbovirus en Florida para el periodo ${match[2]}.`
      : source.fallbackSummary,
    sourceUrl: source.sourceUrl,
    publishedAt: isoFromDateLabel(lastModified || ""),
  };
}

const PARSERS = {
  rss: parseRss,
  "drought-data": parseDroughtData,
  "census-nrc": parseCensusNrc,
  "preb-dockets": parsePrebDockets,
  "salud-home": parseSaludHome,
  "florida-psc": parseFloridaPsc,
  "florida-health": parseFloridaHealth,
};

async function fetchSource(source) {
  try {
    const response = await fetch(source.fetchUrl, {
      headers: {
        "user-agent": "SolarisPowerDashboard/1.0",
        accept: "text/html,application/xhtml+xml,application/xml,text/xml;q=0.9,*/*;q=0.8",
      },
      cache: "no-store",
    });
    const text = await response.text();
    const parser = PARSERS[source.parser];
    const parsed = parser ? parser(text, source, response) : {};
    return {
      id: source.id,
      category: source.category,
      severity: source.severity,
      title: parsed.title || source.title,
      summary: parsed.summary || source.fallbackSummary,
      whyItMatters: source.whyItMatters,
      sourceLabel: source.sourceLabel,
      sourceUrl: parsed.sourceUrl || source.sourceUrl,
      publishedAt: parsed.publishedAt || null,
      sourceState: "live",
    };
  } catch (_error) {
    return {
      id: source.id,
      category: source.category,
      severity: source.severity,
      title: source.title,
      summary: source.fallbackSummary,
      whyItMatters: source.whyItMatters,
      sourceLabel: source.sourceLabel,
      sourceUrl: source.sourceUrl,
      publishedAt: null,
      sourceState: "fallback",
    };
  }
}

module.exports = async function handler(req, res) {
  const region = req.query.region === "florida" ? "florida" : "puerto-rico";
  const sources = REGION_SOURCES[region] || REGION_SOURCES["puerto-rico"];
  const items = await Promise.all(sources.map(fetchSource));

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.status(200).json({
    region,
    fetchedAt: new Date().toISOString(),
    items,
  });
};
