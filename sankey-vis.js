class SankeyVis {
  constructor(
    _parentElement,
    _data,
    _accessors,
    _sourceAccessorKey,
    _sourceAccessorKeyText,
    _sourceColor,
    _targetAccessorKey,
    _targetAccessorKeyText,
    _targetColor,
    _filterYear,
    _filterState,
    _tooltipElement
  ) {
    this.parentElement = _parentElement;
    this.data = _data;
    this.accessors = _accessors;
    this.sourceAccessorKey = _sourceAccessorKey;
    this.sourceAccessorKeyText = _sourceAccessorKeyText;
    this.sourceColor = _sourceColor;
    this.targetAccessorKey = _targetAccessorKey;
    this.targetAccessorKeyText = _targetAccessorKeyText;
    this.targetColor = _targetColor;
    this.filterYear = _filterYear;
    this.filterState = _filterState;
    this.tooltipElement = _tooltipElement;
    this.initVis();
  }

  initVis() {
    let vis = this;

    vis.margin = {
      top: 50,
      right: 1,
      bottom: 10,
      left: 1,
    };

    vis.width = d3.select("#" + vis.parentElement).node().clientWidth;
    vis.height = 500;

    vis.svg = d3
      .select("#" + vis.parentElement)
      .append("svg")
      .attr("viewBox", [0, 0, vis.width, vis.height]);

    vis.sankey = d3
      .sankey()
      .nodeId((d) => d.id)
      .nodeSort((a, b) => d3.descending(a.value, b.value))
      .nodeWidth(20)
      .nodePadding(5)
      .extent([
        [vis.margin.left, vis.margin.top],
        [vis.width - vis.margin.right, vis.height - vis.margin.bottom],
      ]);

    vis.path = d3.sankeyLinkHorizontal();

    vis.dataByYearByState = d3.group(
      vis.data,
      vis.accessors.year,
      vis.accessors.state
    );

    vis.title = vis.svg
      .append("text")
      .attr("class", "chart-title h5")
      .attr("y", 20)
      .attr("fill", "currentColor")
      .attr("font-weight", "bold");

    vis.nodeTitle = vis.svg
      .append("g")
      .attr("class", "node-titles")
      .selectAll(".node-title")
      .data([vis.sourceAccessorKeyText, vis.targetAccessorKeyText])
      .join("text")
      .attr("fill", "currentColor")
      .attr("font-weight", "bold")
      .attr("text-anchor", (d, i) => (i ? "end" : "start"))
      .attr("y", vis.margin.top - 10)
      .text((d) => d);

    vis.linksGroup = vis.svg.append("g").attr("class", "links");

    vis.nodesGroup = vis.svg.append("g").attr("class", "nodes");

    vis.nodeLabelsGroup = vis.svg.append("g").attr("class", "node-labels");

    vis.tooltip = d3.select("#" + vis.tooltipElement);

    vis.wrangleData();
  }

  wrangleData() {
    let vis = this;

    let data = vis.dataByYearByState?.get(vis.filterYear)?.get(vis.filterState);

    let nodes = new Map();
    let links = new Map();

    data.forEach((d) => {
      let source = vis.accessors[vis.sourceAccessorKey](d);
      let target = vis.accessors[vis.targetAccessorKey](d);
      if (!nodes.has(source)) {
        nodes.set(source, { id: source, color: vis.sourceColor(source) });
      }
      if (!nodes.has(target)) {
        nodes.set(target, { id: target, color: vis.targetColor(target) });
      }
      if (!links.has(`${source}-${target}`)) {
        links.set(`${source}-${target}`, {
          source,
          target,
          value: 0,
        });
      }
      links.get(`${source}-${target}`).value++;
    });

    this.displayData = {
      nodes: [...nodes.values()],
      links: [...links.values()],
    };

    vis.sankey({
      nodes: this.displayData.nodes,
      links: this.displayData.links,
    });

    console.log(this.displayData);
    vis.updateVis();
  }

  updateVis() {
    let vis = this;

    vis.title.text(`Hate Crimes in ${vis.filterState} ${vis.filterYear}`);

    vis.nodeTitle.attr("x", (d, i) =>
      i ? vis.width - vis.margin.right : vis.margin.left
    );

    vis.node = vis.nodesGroup
      .selectAll(".node")
      .data(this.displayData.nodes)
      .join("rect")
      .attr("class", "node")
      .attr("fill", (d) => d.color)
      .attr("x", (d) => d.x0)
      .attr("y", (d) => d.y0)
      .attr("height", (d) => d.y1 - d.y0)
      .attr("width", (d) => d.x1 - d.x0)
      .on("mouseover", (event, d) => {
        vis.tooltip
          .html(
            `
              <div>
                <div>${d.id}</div>
                <div>${d3.format(",")(d.value)}</div>
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
        vis.tooltip.classed("visible", false);
      });

    vis.link = vis.linksGroup
      .selectAll(".link")
      .data(this.displayData.links)
      .join("path")
      .attr("class", "link")
      .attr("d", vis.path)
      .attr("stroke-width", (d) => Math.max(1, d.width))
      .on("mouseover", (event, d) => {
        vis.tooltip
          .html(
            `
              <div>
                <div>${d.source.id} → ${d.target.id}</div>
                <div>${d3.format(",")(d.value)}</div>
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
        vis.tooltip.classed("visible", false);
      });

    vis.nodeLabel = vis.nodeLabelsGroup
      .selectAll(".node-label")
      .data(this.displayData.nodes)
      .join("text")
      .attr("class", "node-label")
      .attr("x", (d) => (d.x0 < vis.width / 2 ? d.x1 + 5 : d.x0 - 5))
      .attr("y", (d) => (d.y1 + d.y0) / 2)
      .attr("dy", "0.35em")
      .attr("text-anchor", (d) => (d.x0 < vis.width / 2 ? "start" : "end"))
      .text((d) => d.id);
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
