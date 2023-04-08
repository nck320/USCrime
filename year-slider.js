class YearSlider {
  constructor(_parentElement, _min, _max, _value, _dispatch) {
    this.parentElement = _parentElement;
    this.min = _min;
    this.max = _max;
    this.value = _value;
    this.dispatch = _dispatch;
    this.initVis();
  }

  initVis() {
    let vis = this;

    // Slider consists of three parts, the label, the slider, the value
    vis.wrapper = d3
      .select("#" + vis.parentElement)
      .attr("class", "d-flex align-items-center");

    vis.wrapper
      .append("label")
      .attr("class", "me-3")
      .attr("for", "yearInput")
      .text("Year");

    vis.wrapper
      .append("input")
      .attr("type", "range")
      .attr("id", "yearInput")
      .attr("class", "form-range")
      .attr("min", vis.min)
      .attr("max", vis.max)
      .attr("value", vis.value)
      .on("input", (event) => {
        vis.yearValue = event.target.valueAsNumber;
        vis.dispatch.call("yearchange", null, event.target.valueAsNumber);
      });

    vis.yearValue = vis.wrapper
      .append("div")
      .attr("class", "ms-3")
      .text(vis.value);
  }
}
