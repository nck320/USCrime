class ChoroplethVis {
  constructor(
    _parentElement,
    _geoData,
    _data,
    _accessors,
    _filterYear,
    _filterState,
    _legendElement,
    _tooltipElement,
    _dispatch
  ) {
    this.parentElement = _parentElement;
    this.geoData = _geoData;
    this.data = _data;
    this.accessors = _accessors;
    this.filterYear = _filterYear;
    this.filterState = _filterState;
    this.legendElement = _legendElement;
    this.tooltipElement = _tooltipElement;
    this.dispatch = _dispatch;
    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.width = 960;
    vis.height = 610;

    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("viewBox", [0, 0, vis.width, vis.height]);

    vis.projection = d3.geoAlbersUsa().scale(1300).translate([487.5, 305]);
    vis.geoPath = d3.geoPath();

    vis.countByYearByState = d3.rollup(
      vis.data,
      (g) => g.length,
      vis.accessors.year,
      vis.accessors.state
    );

    vis.color = d3
      .scaleQuantize()
      .domain([
        0,
        // d3.max(vis.countByYearByState.values(), (countyByState) =>
        //   d3.max(countyByState.values())
        // ),
        // The original max value is 2246. We use 2250 here so the legend has nice looking step of 250
        2250,
      ])
      .range(d3.schemeYlOrRd[9]);

    vis.statePath = vis.svg
      .selectAll("path")
      .data(vis.geoData.features, (d) => d.properties.name)
      .join("path")
      .attr("class", "state-path")
      .attr("d", vis.geoPath)
      .on("mouseover", (event, d) => {
        vis.statePath
          .classed("hovered", (e) => e === d)
          .filter((e) => e === d)
          .raise();

        vis.tooltip
          .html(
            `
          <div>
            <div>${d.properties.name}</div>
            <div>Hate Crime</div>
            <div>${d3.format(",")(
              vis.displayData.get(d.properties.name) || 0
            )}</div>
          </div>
        `
          )
          .classed("visible", true);
      })
      .on("mousemove", (event) => {
        vis.tooltip
          .style("left", event.pageX + 10 + "px")
          .style("top", event.pageY + "px");
      })
      .on("mouseout", (event, d) => {
        vis.statePath
          .classed("hovered", false)
          .filter((e) => e.properties.name === vis.filterState)
          .raise();

        vis.tooltip.classed("visible", false);
      })
      .on("click", (event, d) => {
        if (d.properties.name !== vis.filterState) {
          vis.dispatch.call("statechange", null, d.properties.name);
        }
      });

    vis.tooltip = d3.select("#" + vis.tooltipElement);

    vis.legend = d3.select("#" + vis.legendElement);
    vis.legend.node().appendChild(
      Legend(vis.color, {
        title: "Hate Crime Count",
        tickFormat: d3.format(","),
      })
    );

    vis.wrangleData();
  }

  wrangleData() {
    let vis = this;

    vis.displayData = vis.countByYearByState.get(vis.filterYear);

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    vis.statePath
      .attr("fill", (d) => {
        const count = vis.displayData.get(d.properties.name) || 0;
        return vis.color(count);
      })
      .classed("zero", (d) => !vis.displayData.has(d.properties.name))
      .classed("highlighted", (d) => d.properties.name === vis.filterState)
      .filter((d) => d.properties.name === vis.filterState)
      .raise();
  }

  onFilterYearChange(filterYear) {
    let vis = this;

    vis.filterYear = filterYear;
    vis.wrangleData();
  }

  onFilterStateChange(filterState) {
    let vis = this;

    vis.filterState = filterState;
    vis.updateVis();
  }
}
