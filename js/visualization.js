// Self invoking function
(function() {

    // Set offset for antarctica
    var offset = 170;

    // Set margins
    var margin = { top: 0, left: 0, right: 0, bottom: 0},
    height = 600 - offset - margin.top - margin.bottom,
    width = 720 - margin.left - margin.right
    goal = 1420070400;

    // Update label
    var d = new Date(goal * 1000);
    var text =  d.getFullYear() + '/' +  (d.getMonth()+1 < 10 ? "0"+d.getMonth()+1 : d.getMonth()+1) + '/' + d.getDate();
    d3.select('#goal-label').text(text);

    // Create svg
    var svg = d3.select("#map")
        .append("svg")
        .attr("height", height + margin.top + margin.bottom)
        .attr("width", width + margin.left + margin.right)
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Read in topojson data using the d3.json processor
    d3.queue()
        .defer(d3.json, "data/countries.json") // var countries
        .defer(d3.csv, "data/freebasics.csv") // var fb
        .await(ready);

    // Translate between a round globe and flat screen
    var projection = d3.geoMercator()
        .rotate([115, 0]) // Center map around Canada
        .translate([ width / 2, height / 2 + offset / 2 ]) // Center it
        .scale(100); // Zoom 100%

    // Create a path and set its projection
    var path = d3.geoPath()
        .projection(projection);

    // Run once the DOM is ready
    // (error, defer1, defer2, ...)
    function ready(error, countries, fb) {

        // Extract countries from topojson and countries key
        var features = topojson.feature(countries, countries.objects.units).features;

        // Left Join csvs
        var data = features.map(function(topo) {
            return Object.assign({}, topo, fb.reduce(function(empty, freebasics) {
                // If country codes match
                if (freebasics.code === topo.id) {
                    return freebasics;
                } else {
                    return empty;
                }
            }, {}))
        });

        // Store selected country
        var selected = null;
        var selectedId = '';

        // Add path for each country (shapes -> path)
        svg.selectAll(".country")
            .data(data)
            .enter() // Can only proceed if it can attach to something
            .append("path")
            .attr("class", function(d) {
                // Initialize some countries with colour
                if (d.status == "Added") {
                    return "country " + (d.timestamp < goal ? "visible" : "hidden");
                }
                return "country";
            })
            .attr("d", path)
            // Add .selected class on click
            .on("click", function(d) {
                // Deselect previous country
                if (selected != null) {
                    d3.select(selected).classed("selected", false);
                    d3.select("#" + selectedId)
                        .classed("selected", false)
                        .html(function(d) {
                            return d.properties.name;
                        });
                }
                // Else, highlight the selected country
                d3.select(this).classed("selected", true);
                d3.select("#" + d.id)
                    .classed("selected", true)
                    .html(function(d) {
                        if (d.status == "Added") {
                            var date = new Date(goal * 1000);
                            var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                            return d.properties.name + " (" + d.provider + ", " + dateText + ")";
                        }
                        return d.properties.name + " (No rollout)";
                    });

                // If you click on the same country twice, deselect
                if (selectedId == d.id) {
                // Deselect current country
                if (selected != null) {
                    d3.select(selected).classed("selected", false);
                    d3.select("#" + selectedId)
                        .classed("selected", false)
                        .html(function(d) {
                            return d.properties.name;
                        });
                } 
            }

                // Set selected country strings
                selected = this;
                selectedId = d.id;
            })
            // Add .hovering class on mouse over
            .on("mouseover", function(d) {
                d3.select(this).classed("hovering", true);
                d3.select("#" + d.id).classed("hovering", true);
            })
            // Remove .hovering class on mouse out
            .on("mouseout", function(d) {
                d3.select(this).classed("hovering", false);
                d3.select("#" + d.id).classed("hovering", false);
            });

        // Add country labels
        svg.selectAll(".country-label")
        .data(data)
        .enter()
        .append("text")
        .attr("class", "country-label")
        .attr("id", function(d) {
            return d.id;
        })
        .attr("x", function(d) {
            // Get x coordinate based on shape type (3d vs 4d)
            var coords = (d.geometry.coordinates[0][0][0][0] == undefined) ? 
                projection([d.geometry.coordinates[0][0][0], d.geometry.coordinates[0][0][1]]) : 
                projection([d.geometry.coordinates[0][0][0][0], d.geometry.coordinates[0][0][0][1]]);
            return coords[0];
        })
        .attr("y", function(d) {
            // Get y coordinate based on shape type (3d vs 4d)
            var coords = (d.geometry.coordinates[0][0][0][0] == undefined) ? 
                projection([d.geometry.coordinates[0][0][0], d.geometry.coordinates[0][0][1]]) : 
                projection([d.geometry.coordinates[0][0][0][0], d.geometry.coordinates[0][0][0][1]]);
            return coords[1];
        })
        .html(function(d) {
            return d.properties.name;
        });
        
        // Add the goal
        d3.select("#goal").on("input", function() {
            goal = +this.value;
            d3.select('#goal-value').text(goal);
            svg.selectAll("svg path").each(function(d) { 
                // Change class
                if (d.status == "Added") {
                    this.classList.add(d.timestamp < goal ? "visible" : "hidden");
                    this.classList.remove(d.timestamp < goal ? "hidden" : "visible");
                    // Update label
                    var d = new Date(goal * 1000);
                    var text =  d.getFullYear() + '/' +  ((d.getMonth()+1 < 10) ? ("0")+(d.getMonth()+1) : d.getMonth()+1) + '/' + ((d.getDate() < 10) ? ("0")+(d.getDate()) : d.getDate());
                    d3.select('#goal-label').text(text);
                }
            });
        });

        // Add slider
        var heightChart = 100;

        // Set slider range
        var xChart = d3.scaleBand()
            .range([0, width])
            .padding(0.1);
        var yChart = d3.scaleLinear()
            .range([heightChart, 0]);

        // Append an SVG object to the body element
        var svgChart = d3.select('#chart')
            .append('svg')
            .attr('width', width)
            .attr('height', heightChart + 5)
            .append('g')
            .attr('transform', 'translate(' + margin.left + 20 + ',' + margin.right + ')');

        // Load Data
        d3.csv("data/providers.csv", function(error, data) {
            if (error) throw error;

            // Format the data
            data.forEach(function(d) {
                // Use unary plus operator (+) to convert strings to numbers
                d.count = +d.count;
            });

            // Sort the data by provider size
            data.sort(function(a, b) {
                return b.count - a.count;
            });

            // Scale the range of the data in the domains
            xChart.domain(data.map(function(d) {
                return d.name;
            }));
            yChart.domain([0, d3.max(data, function(d) {
                return d.count;
            })]);

            // Append the rectangles for the bar chart
            svgChart.selectAll(".bar")
                .data(data)
                .enter().append("rect")
                .attr("class", "bar")
                .attr("x", function(d) {
                    return xChart(d.name);
                })
                .attr("width", xChart.bandwidth())
                .attr("y", function(d) {
                    return yChart(d.count);
                })
                .attr("height", function(d) {
                    return heightChart - yChart(d.count);
                });
            // Add the x Axis
            svgChart.append("g")
                .attr("class", "x-axis")
                .attr("transform", "translate(0," + heightChart + ")")
                .call(d3.axisBottom(xChart))
                .selectAll("text")
                .attr("y", 0)
                .attr("x", 5)
                .attr("dy", ".35em")
                .attr("transform", "rotate(-90)")
                .style("text-anchor", "start");

            // Add the y Axis
            svgChart.append("g")
                .attr("class", "y-axis")
                .call(d3.axisLeft(yChart));
            });
        }
}());