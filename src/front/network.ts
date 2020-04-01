import * as d3 from "d3";

import { IMargin } from "../types";
import { Selection } from "d3";
import colors from "./colors";
import { playOrPause } from "./player";

export default class Network {
  width: number;
  height: number;
  margin: IMargin;
  xScale;
  data: { links: any[]; nodes: any[] };
  private svg: Selection<SVGSVGElement, {}, HTMLElement, any>;
  private radius: number;
  private fontSize: number;

  constructor(properties: any) {
    this.width = properties.width;
    this.height = properties.height;
    this.margin = properties.margin;
    this.data = properties.data;
    this.data.nodes.sort((a, b) => b.numLinks - a.numLinks);
    this.radius = Math.min(this.width, this.height) / 60;
    this.fontSize = this.radius / 4;
  }

  public make(selector: string): void {
    this.buildSVG(selector);
    this.generateNetwork();
    this.generateLabels();
  }

  private generateContainerGroups(): void {
    const container = this.svg.append("g").classed("container-group", true);
    container.append("g").classed("chart-group", true);
    container
      .select(".chart-group")
      .append("g")
      .classed("metadata-group", true);
  }

  private buildSVG(selector: string): void {
    if (!this.svg) {
      this.svg = d3
        .select(selector)
        .append("svg")
        .classed("network-chart", true);
      this.generateContainerGroups();
    }
    this.svg.attr("width", this.width).attr("height", this.height);
  }

  private handleMouseOver(d, index: number, circles: Selection<any, any, any, any>) {
    const circle = circles[index];
    d3.select(circle).raise();
    d3.select(circle)
      .select(".artists")
      .transition()
      .ease(d3.easeLinear)
      .duration(500)
      .style("stroke", colors.spotifyGreen);
    d3.select(circle)
      .select(".play-button")
      .transition()
      .ease(d3.easeLinear)
      .duration(500)
      .style("fill", colors.spotifyGreen);
  }

  private handleMouseOut(d, index: number, circles: Selection<any, any, any, any>) {
    const circle = circles[index];
    const textNode = d3.select(circle).select(".play-button");
    if (textNode.text() === "| |") return;
    d3.select(circle)
      .select(".artists")
      .transition()
      .ease(d3.easeLinear)
      .duration(500)
      .style("stroke", colors.white);
    d3.select(circle)
      .select(".play-button")
      .transition()
      .ease(d3.easeLinear)
      .duration(500)
      .style("fill", colors.white);
  }

  private handleClick(d, index: number, circles: Selection<any, any, any, any>) {
    const circle = circles[index];
    const textNode = d3.select(circle).select(".play-button");
    const textValue = textNode.text();
    const newTextValue = textValue === "▶" ? "| |" : "▶";
    playOrPause(d.track, newTextValue === "▶");
    textNode.text(d => newTextValue);
    d3.select(circle)
      .select(".artists")
      .style("stroke", d => (newTextValue === "▶" ? colors.white : colors.spotifyGreen));
    textNode.style("fill", d => (newTextValue === "▶" ? colors.white : colors.spotifyGreen));
  }

  private generateNetwork(): void {
    const fillImages = this.svg
      .select(".chart-group")
      .selectAll(".image-fill")
      .data(this.data.nodes);

    const img_id = d => `img_network_${d.i}`;
    const img_url = d => `url(#img_network_${d.i})`;

    fillImages
      .enter()
      .append("pattern")
      .attr("id", img_id)
      .attr("width", 1)
      .attr("height", 1)
      .attr("patternUnits", "objectBoundingBox")
      .append("image")
      .classed(".image-fill", true)
      .attr("x", 0)
      .attr("y", 0)
      .attr("width", 2 * this.radius)
      .attr("height", 2 * this.radius)
      .attr("xlink:href", d => d.image);

    const drag = simulation => {
      function dragstarted(d) {
        if (!d3.event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      }

      function dragged(d) {
        d.fx = d3.event.x;
        d.fy = d3.event.y;
      }

      function dragended(d) {
        if (!d3.event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      }

      return d3
        .drag()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended);
    };

    const simulation = d3
      .forceSimulation(this.data.nodes)
      .force(
        "link",
        d3
          .forceLink(this.data.links)
          // @ts-ignore
          .id(d => d.id)
          .distance(this.radius * 6)
      )
      .force("collision", d3.forceCollide(this.radius * 3))
      .force("center", d3.forceManyBody().strength(-100))
      .force("center", d3.forceCenter(this.width / 2, this.height / 2));

    const link = this.svg
      .select(".chart-group")
      .append("g")
      .attr("stroke", colors.white)
      .attr("stroke-opacity", 1)
      .selectAll("line")
      .data(this.data.links)
      .join("line")
      .attr("stroke-width", d => 2);

    let nodeGroup = this.svg
      .select(".chart-group")
      .selectAll(".artists")
      .data(this.data.nodes);

    nodeGroup = nodeGroup
      .enter()
      .append("g")
      .on("mouseout", this.handleMouseOut.bind(this))
      .on("mouseover", this.handleMouseOver.bind(this))
      .on("click", this.handleClick.bind(this))
      .call(drag(simulation));

    const node = nodeGroup
      .append("circle")
      .attr("r", this.radius)
      .style("fill", img_url)
      .style("stroke", colors.white)
      .style("stroke-width", 2)
      .classed("artists", true)
      .style("cursor", "pointer");

    nodeGroup.append("title").text(d => `#${d.rank} ${d.id}`);

    const playButton = nodeGroup
      .append("text")
      .text(d => "▶")
      .style("text-anchor", "middle")
      .style("dominant-baseline", "central")
      .style("font-size", () => `${2 * this.fontSize}px`)
      .style("opacity", 1)
      .style("cursor", "pointer")
      .attr("fill", "white")
      .style("font-weight", "bold")
      .classed("play-button", true);

    simulation.on("tick", () => {
      link
        .attr("x1", d => d.source.x)
        .attr("y1", d => d.source.y)
        .attr("x2", d => d.target.x)
        .attr("y2", d => d.target.y);

      node.attr("cx", d => d.x).attr("cy", d => d.y);
      playButton.attr("x", d => d.x).attr("y", d => d.y);
    });
  }

  private generateLabels() {
    const titleLabel = this.svg.append("g").classed(".title-label-group", true);

    titleLabel
      .append("text")
      .attr("x", 20)
      .attr("y", 60)
      .text("Your Top 50 Artists Network")
      .style("text-anchor", "start")
      .style("dominant-baseline", "central")
      .style("font-size", () => `${10 * this.fontSize}px`)
      .attr("fill", "white")
      .classed("chart-title", true);
  }
}
