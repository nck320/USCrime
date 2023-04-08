let promises = [
  d3.json("https://cdn.jsdelivr.net/npm/us-atlas@3/states-albers-10m.json"),
  d3.csv("data/hate_crime.csv"),
];

Promise.all(promises)
  .then((data) => {
    createVis(data);
  })
  .catch((err) => {
    console.error(err);
  });

function createVis(data) {
  /**
   * Wrangle data
   */
  let geoData = topojson.feature(data[0], data[0].objects.states);
  let allData = data[1];

  // Define value accessor functions
  let yearAccessor = (d) => +d.DATA_YEAR;
  let stateAccessor = (d) => d.STATE_NAME;
  let offenderRaceAccessor = (d) => d.OFFENDER_RACE;
  let biasDescriptionAccessor = (d) => d.BIAS_DESC;
  let accessors = {
    year: (d) => +d.DATA_YEAR,
    state: (d) => d.STATE_NAME,
    offenderRace: (d) => d.OFFENDER_RACE,
    biasDescription: (d) => d.BIAS_DESC,
  };

  // Calculate the years extent to set up the slider
  let [minYear, maxYear] = d3.extent(allData, yearAccessor);

  // Wrangle offender race values
  allData.forEach((d) => {
    // Assign empty value as "Unknown"
    if (offenderRaceAccessor(d) === "") {
      d.OFFENDER_RACE = "Unknown";
    }
  });
  // Sort offender race values by descending count
  // https://observablehq.com/@d3/d3-groupsort?collection=@d3/d3-array
  let allOffenderRaces = d3.groupSort(
    allData,
    (g) => -g.length,
    offenderRaceAccessor
  );

  let offenderColor = d3
    .scaleOrdinal()
    .domain(allOffenderRaces)
    .range(
      d3.quantize(
        (t) => d3.interpolateWarm(d3.scaleLinear().range([0.1, 0.9])(t)),
        allOffenderRaces.length
      )
    );

  // Wrangle bias description values;
  allData.forEach((d) => {
    // If multiple values are present, use the first value
    if (biasDescriptionAccessor(d).indexOf(";") !== -1) {
      d.BIAS_DESC = biasDescriptionAccessor(d).split(";")[0];
    }
    // Combine Anti-LGBQ
    if (
      [
        "Anti-Gay (Male)",
        "Anti-Lesbian, Gay, Bisexual, or Transgender (Mixed Group)",
        "Anti-Lesbian (Female)",
        "Anti-Bisexual",
        "Anti-Transgender",
        "Anti-Gender Non-Conforming",
      ].includes(biasDescriptionAccessor(d))
    ) {
      d.BIAS_DESC = "Anti-LGBT";
    }
    // Combine Anti-Christian
    if (
      [
        "Anti-Catholic",
        "Anti-Protestant",
        "Anti-Eastern Orthodox (Russian, Greek, Other)",
        "Anti-Other Christian",
      ].includes(biasDescriptionAccessor(d))
    ) {
      d.BIAS_DESC = "Anti-Christian";
    }
  });
  // Calculate the percentages of each bias description
  let allBiasDescriptionPercentages = d3
    .rollups(allData, (g) => g.length / allData.length, biasDescriptionAccessor)
    .sort((a, b) => d3.descending(a[1], b[1]));
  // Remove any bias description that's below 5%;
  let keptBiasDescriptionValues = allBiasDescriptionPercentages
    .filter((d) => d[1] >= 0.05)
    .map((d) => d[0]);
  allData.forEach((d) => {
    // Combine all other bias descriptions into a single "Others" category
    if (keptBiasDescriptionValues.indexOf(biasDescriptionAccessor(d)) === -1) {
      d.BIAS_DESC = "Others";
    }
  });
  let allBiasDescriptions = d3.groupSort(
    allData,
    (g) => -g.length,
    biasDescriptionAccessor
  );
  let biasColor = d3
    .scaleOrdinal()
    .domain(allBiasDescriptions)
    .range(
      d3.quantize(
        (t) => d3.interpolateCool(d3.scaleLinear().range([0.1, 0.9])(t)),
        allBiasDescriptions.length
      )
    );

  /**
   * Create visualizations
   */
  let filterYear = maxYear;
  let filterState = "California";

  // Create event dispatcher
  let dispatch = d3.dispatch("yearchange", "statechange");

  // Create visualization instances
  let yearSlider = new YearSlider(
    "yearSlider",
    minYear,
    maxYear,
    filterYear,
    dispatch
  );

  let stateCountVis = new ChoroplethVis(
    "stateCountVis",
    geoData,
    allData,
    accessors,
    filterYear,
    filterState,
    "stateCountLegend",
    "tooltip",
    dispatch
  );

  let offenderBiasVis = new SankeyVis(
    "offenderBiasVis",
    allData,
    accessors,
    "offenderRace",
    "Offender Race",
    offenderColor,
    "biasDescription",
    "Bias Description",
    biasColor,
    filterYear,
    filterState,
    "tooltip"
  );

  let offenderVis = new StackedBarVis(
    "offenderVis",
    allData,
    accessors,
    "offenderRace",
    "Offender Race",
    allOffenderRaces,
    offenderColor,
    filterYear,
    filterState,
    "offenderLegend",
    "tooltip"
  );

  let biasVis = new StackedBarVis(
    "biasVis",
    allData,
    accessors,
    "biasDescription",
    "Bias Description",
    allBiasDescriptions,
    biasColor,
    filterYear,
    filterState,
    "biasLegend",
    "tooltip"
  );

  // Create event handlers
  dispatch.on("yearchange", (year) => {
    filterYear = year;
    stateCountVis.onFilterYearChange(filterYear);
    offenderVis.onFilterYearChange(filterYear);
    biasVis.onFilterYearChange(filterYear);
    offenderBiasVis.onFilterYearChange(filterYear);
  });

  dispatch.on("statechange", (state) => {
    filterState = state;
    stateCountVis.onFilterStateChange(filterState);
    offenderVis.onFilterStateChange(filterState);
    biasVis.onFilterStateChange(filterState);
    offenderBiasVis.onFilterStateChange(filterState);
  });
}
