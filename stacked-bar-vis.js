class StackedBarVis {
  constructor(
    _parentElement,
    _data,
    _accessors,
    _stackAccessorKey,
    _stackAccessorKeyText,
    _stackKeys,
    _color,
    _filterYear,
    _filterState,
    _legendElement,
    _tooltipElement
  ) {
    this.parentElement = _parentElement;
    this.data = _data;
    this.accessors = _accessors;
    this.stackAccessorKey = _stackAccessorKey;
    this.stackAccessorKeyText = _stackAccessorKeyText;
    this.stackKeys = _stackKeys;
    this.color = _color;
    this.filterYear = _filterYear;
    this.filterState = _filterState;
    this.legendElement = _legendElement;
    this.tooltipElement = _tooltipElement;
    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.margin = {
      top: 50,
      right: 10,
      bottom: 30,
      left: 40,
    };

    vis.width = d3.select("#" + vis.parentElement).node().clientWidth;
    vis.height = 400;

    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("viewBox", [0, 0, vis.width, vis.height]);

    vis.x = d3
      .scaleBand()
      .range([vis.margin.left, vis.width - vis.margin.right])
      .paddingInner(0.2);

    vis.xAxis = d3
      .axisBottom(vis.x)
      .tickSizeOuter(0)
      .tickFormat((d) => (d % 5 === 0 ? d : "")); // Label every 5th year to avoid  overlapping

    vis.y = d3
      .scaleLinear()
      .range([vis.height - vis.margin.bottom, vis.margin.top]);

    vis.yAxis = d3.axisLeft(vis.y).ticks(vis.height / 60);

    vis.stack = d3.stack().keys(vis.stackKeys);

    vis.allYears = [...new Set(vis.data.map(vis.accessors.year))];

    vis.countByStateByYearByStack = d3.rollup(
      vis.data,
      (g) => g.length,
      vis.accessors.state,
      vis.accessors.year,
      vis.accessors[vis.stackAccessorKey]
    );

    vis.title = vis.svg
      .append("text")
      .attr("class", "chart-title h5")
      .attr("y", 20)
      .attr("fill", "currentColor")
      .attr("font-weight", "bold");

    vis.highlightGroup = vis.svg.append("g").attr("class", "highlight");

    vis.highlightGroup
      .append("line")
      .attr("class", "highlight-line")
      .attr("y1", vis.margin.top)
      .attr("y2", vis.height - vis.margin.bottom);

    vis.highlightGroup
      .append("text")
      .attr("class", "highlight-year")
      .attr("fill", "currentColor")
      .attr("text-anchor", "middle")
      .attr("y", vis.margin.top - 10);

    vis.barsGroup = vis.svg.append("g").attr("class", "bars");

    vis.xAxisGroup = vis.svg.append("g").attr("class", "x-axis axis");

    vis.yAxisGroup = vis.svg.append("g").attr("class", "y-axis axis");

    vis.tooltip = d3.select("#" + vis.tooltipElement);

    vis.legend = d3.select("#" + vis.legendElement);
    vis.legend.html(Swatches(vis.color));

    vis.wrangleData();
  }

  wrangleData() {
    let vis = this;

    const yearlyData = vis.allYears.map((year) => {
      let d = { year };
      vis.stackKeys.map((stackKey) => {
        d[stackKey] =
          vis.countByStateByYearByStack
            .get(vis.filterState)
            ?.get(year)
            ?.get(stackKey) || 0;
      });
      return d;
    });

    vis.displayData = vis.stack(yearlyData);

    vis.x.domain(vis.allYears);

    vis.y
      .domain([
        0,
        d3.max(vis.displayData[vis.displayData.length - 1], (d) => d[1]),
      ])
      .nice();

    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    vis.title.text(`${vis.stackAccessorKeyText} in ${vis.filterState}`);

    vis.highlightGroup
      .attr(
        "transform",
        `translate(${vis.x(vis.filterYear) + vis.x.bandwidth() / 2},0)`
      )
      .call((g) => g.select(".highlight-year").text(vis.filterYear));

    vis.bar = vis.barsGroup
      .selectAll(".bar")
      .data(vis.displayData)
      .join("g")
      .attr("class", "bar")
      .attr("fill", (d) => vis.color(d.key));

    vis.barRect = vis.bar
      .selectAll(".bar-rect")
      .data((d) => d)
      .join("rect")
      .attr("class", "bar-rect")
      .attr("x", (d) => vis.x(d.data.year))
      .attr("width", vis.x.bandwidth())
      .attr("y", (d) => Math.min(vis.y(d[0]), vis.y(d[1])))
      .attr("height", (d) => Math.abs(vis.y(d[0]) - vis.y(d[1])))
      .on("mouseover", (event, d) => {
        const bar = d3.select(event.target.parentNode).datum();

        vis.bar.filter((e) => e === bar).raise();

        vis.tooltip
          .html(
            `
              <div>
                <div>${d.data.year}</div>
                <div>${bar.key}</div>
                <div>${d3.format(",")(d.data[bar.key])}</div>
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
      .on("mouseout", () => {
        vis.bar.classed("hovered", false);

        vis.tooltip.classed("visible", false);
      });

    vis.xAxisGroup
      .attr("transform", `translate(0,${vis.y(0)})`)
      .call(vis.xAxis);

    vis.yAxisGroup
      .attr("transform", `translate(${vis.margin.left},0)`)
      .call(vis.yAxis)
      .call((g) => g.select(".domain").remove());
  }

  onFilterYearChange(filterYear) {
    let vis = this;

    vis.filterYear = filterYear;
    vis.wrangleData();
  }

  onFilterStateChange(filterState) {
    let vis = this;

    vis.filterState = filterState;
    vis.wrangleData();
  }
}
