import * as d3 from "d3";

import { Selection } from "d3";
import colors from "./colors";
import { playOrPause } from "./player";

export default class GenreChart {
  width: number;
  height: number;
  data: any;
  duration: number;
  isPlaying: boolean[];
  private svg: Selection<SVGSVGElement, {}, HTMLElement, any>;

  constructor(properties) {
    this.width = properties.width;
    this.height = properties.height;
    this.data = properties.data.sort((a, b) => a.count - b.count);
    this.duration = properties.duration / 4 || 5000;
    this.isPlaying = new Array(this.data.length);
  }

  public make(selector: string): void {
    this.buildSVG(selector);
    this.generateLabels();
    this.generateGenreTexts();
  }

  public update(data): void {
    this.data = data;
    d3.selectAll("*").transition();
    this.generateGenreTexts();
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
        .classed("vertical-bar-chart", true);
      this.generateContainerGroups();
    }
    this.svg.attr("width", this.width).attr("height", this.height);
  }

  private handleMouseOver(d, index: number, valueTexts: Selection<any, any, any, any>) {
    const valueText = valueTexts[index];
    d3.select(valueText).style("fill", colors.spotifyGreen);
    d3.select(valueText).style("stroke", colors.spotifyGreen);
  }

  private handleMouseOut(d, index: number, valueTexts: Selection<any, any, any, any>) {
    const valueText = valueTexts[index];
    if (this.isPlaying[index] === true) return;
    d3.select(valueText).style("fill", colors.white);
    d3.select(valueText).style("stroke", colors.white);
  }

  private handleClick(d, index: number, valueTexts: Selection<any, any, any, any>) {
    const valueText = valueTexts[index];
    const textNode = d3.select(valueText);
    const color = textNode.attr("stroke");
    const newColor = color === colors.lightgray ? colors.spotifyGreen : colors.lightgray;
    const randomArtistIndex = Math.floor(Math.random() * d.artists.length);
    playOrPause(d.artists[randomArtistIndex].track, newColor === colors.white);
    for (let i = 0; i < this.isPlaying.length; i += 1) {
      this.isPlaying[i] = false;
    }
    this.isPlaying[index] = newColor === colors.spotifyGreen;
    textNode.style("stroke", newColor);
    textNode.style("fill", newColor);
  }

  private generateGenreTexts(): void {
    const maxCount = Math.max(...this.data.map(a => a.count));
    const offsetX = this.width / 15;
    const offsetY = this.height / 10;
    const xPosition = d => offsetX + Math.random() * (this.width - 2 * offsetX);
    const yPosition = d => offsetY + Math.random() * (this.height - 2 * offsetY);
    const textValue = d => d.genre;
    const fontSize = d => {
      const minValue = this.height / 64;
      return Math.floor((d.count * this.height) / 10 / maxCount) + minValue;
    };
    const valueTexts = this.svg
      .select(".chart-group")
      .selectAll(".genres")
      .data(this.data);

    const a = valueTexts
      .enter()
      .append("text")
      .attr("x", xPosition)
      .attr("y", yPosition)
      .text(textValue)
      // @ts-ignore
      .merge(valueTexts)
      .style("text-anchor", "middle")
      .style("dominant-baseline", "central")
      .attr("font-size", d => {
        const a = fontSize(d);
        return a;
      })
      .attr("fill", colors.lightgray)
      .attr("stroke", colors.lightgray)
      .attr("stroke-width", 2)
      .style("cursor", "pointer")
      .classed("genres", true)
      .on("mouseout", this.handleMouseOut.bind(this))
      .on("mouseover", this.handleMouseOver.bind(this))
      .on("click", this.handleClick.bind(this));

    a.append("title").text((d, i, data) => `#${this.data.length - i} ${d.genre}`);

    a.transition()
      .duration(2 * this.duration)
      .attr("x", xPosition)
      .attr("y", yPosition);

    valueTexts.exit().remove();
  }

  private generateLabels() {
    const titleLabel = this.svg.append("g").classed(".title-label-group", true);

    titleLabel
      .append("text")
      .attr("x", 20)
      .attr("y", 60)
      .text("Your Top Music Genres")
      .style("text-anchor", "start")
      .style("dominant-baseline", "central")
      .style("font-size", () => `${this.height / 25}px`)
      .classed("chart-title", true)
      .attr("fill", "white");
  }
}
