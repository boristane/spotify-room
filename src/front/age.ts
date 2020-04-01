import * as d3 from "d3";

import { IMargin, ISpotifyTrack } from "../types";
import { Selection } from "d3";
import colors from "./colors";
import { playOrPause } from "./player";
import moment from "moment";

export default class AgesChart {
  width: number;
  height: number;
  margin: IMargin;
  yScale;
  data: { year: number; tracks: ISpotifyTrack[] }[];
  private svg: Selection<SVGSVGElement, {}, HTMLElement, any>;
  private radius: number;
  private fontSize: number;

  constructor(properties: any) {
    this.width = properties.width;
    this.height = properties.height;
    this.margin = properties.margin;
    this.data = properties.data.sort((a, b) => a.year - b.year);
    this.data.sort((a, b) => b.year - a.year);
    const maxYear = this.data[0].year;
    const minYear = this.data[this.data.length - 1].year;

    const maxPerRow = Math.max(...this.data.map(d => d.tracks.length));
    const maxPerCol = Math.abs(maxYear - minYear);
    const radiusForRows = this.width / (3 * maxPerRow);
    const radiusForCols = this.height / (3 * maxPerCol);
    this.radius = Math.min(radiusForRows, radiusForCols);
    if (radiusForCols < radiusForRows) {
      const minRadius = radiusForRows < 24 ? radiusForRows : 24;
      this.radius = this.radius < minRadius ? minRadius : this.radius;
      this.height = 3 * maxPerCol * this.radius;
    }
    this.fontSize = this.radius / 4;
  }

  public make(selector: string): void {
    this.buildSVG(selector);
    this.generateLabels();
    this.generateAgesGroups();
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
        .classed("ages_chart", true);
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

  private generateAgesGroups(): void {
    let data: { track: ISpotifyTrack; year: number }[] = [];
    this.data.forEach(d => {
      d.tracks.forEach(track => {
        data.push({ track, year: d.year });
      });
    });

    data = data.sort(
      (a, b) =>
        // @ts-ignore
        moment(a.track.album.release_date, "YYYY-MM-DD") -
        // @ts-ignore
        moment(b.track.album.release_date, "YYYY-MM-DD")
    );

    let circlesGroup = this.svg
      .select(".chart-group")
      .selectAll(".artist")
      .data(data);

    const years = this.svg
      .select(".chart-group")
      .selectAll(".year")
      .data(this.data);

    const fillImages = this.svg
      .select(".chart-group")
      .selectAll(".image-fill")
      .data(data);
    let currentYear;
    let count = 0;
    const img_id = d => `img_ages_group_${d.track.id}`;
    const img_url = d => `url(#img_ages_group_${d.track.id})`;
    const xPos = (d, i) => {
      if (d.year != currentYear) {
        currentYear = d.year;
        count = 0;
      }
      count += 1;
      return (
        (2 * this.radius + this.margin.left) * (count - 1) + 10 * this.fontSize + this.radius * 1.1
      );
    };
    const yPos = d => this.yScale(d.year);

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
      .attr("xlink:href", d => d.track.album.images[0].url);

    circlesGroup = circlesGroup
      .enter()
      .append("g")
      .on("mouseout", this.handleMouseOut.bind(this))
      .on("mouseover", this.handleMouseOver.bind(this))
      .on("click", this.handleClick.bind(this));

    circlesGroup
      .append("circle")
      .attr("r", this.radius)
      .attr("cx", xPos)
      .attr("cy", yPos)
      .style("fill", img_url)
      .style("stroke", "white")
      .style("stroke-width", this.fontSize / 2)
      .classed("artists", true);

    circlesGroup.append("title").text(d => `${d.track.album.release_date}\n${d.track.name}`);

    years
      .enter()
      .append("text")
      .attr("x", 0)
      .attr("y", d => this.yScale(d.year))
      .text(d => `${d.year}`)
      .style("text-anchor", "start")
      .style("dominant-baseline", "central")
      .style("font-size", () => `${2.5 * this.fontSize}px`)
      .attr("fill", "white")
      .style("font-weight", "bold")
      .classed("year", true);

    circlesGroup
      .append("text")
      .attr("x", xPos)
      .attr("y", yPos)
      .text(d => "▶")
      .style("text-anchor", "middle")
      .style("dominant-baseline", "central")
      .style("font-size", () => `${2 * this.fontSize}px`)
      .style("opacity", 1)
      .style("cursor", "pointer")
      .attr("fill", "white")
      .style("font-weight", "bold")
      .classed("play-button", true);
  }

  private generateLabels() {
    const titleLabel = this.svg.append("g").classed(".title-label-group", true);
    titleLabel
      .append("text")
      .attr("x", 20)
      .attr("y", 30)
      .text("Your Top 50 Songs Release Timeline")
      .style("text-anchor", "start")
      .style("dominant-baseline", "central")
      .style("font-size", () => `${4 * this.fontSize}px`)
      .attr("fill", "white")
      .classed("chart-title", true);

    const offset = 6 * this.fontSize;
    const top = 3 * this.radius + offset;
    const bottom = this.height - top - offset / 4;

    this.yScale = d3
      .scaleLinear()
      .rangeRound([top, bottom])
      .domain([
        Math.min(...this.data.map(data => data.year)),
        Math.max(...this.data.map(data => data.year))
      ]);

    const yLabel = this.svg.append("g").classed(".y-label-group", true);
    const lineWidth = 2;
    yLabel
      .append("rect")
      .attr("height", this.height - 2 * top - offset / 4)
      .attr("width", lineWidth)
      .attr("y", top)
      .style("fill", colors.white)
      .attr("x", 6.5 * this.fontSize);
  }
}
