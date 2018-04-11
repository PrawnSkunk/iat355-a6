// Self invoking function
(function() {

    // Trim Antarctica from map
    var offset = 170;

    // Set margins
    var margin = { top: 0, left: 0, right: 0, bottom: 0},
    height = 600 - offset - margin.top - margin.bottom,
    width = 630 - margin.left - margin.right
    goal = 1420070400;

    // Datetime (2014/01/01 by default)
    var d = new Date(goal * 1000);
    var text =  d.getFullYear() + '/' +  (d.getMonth()+1 < 10 ? "0"+d.getMonth()+1 : d.getMonth()+1) + '/' + d.getDate();
    d3.select('#goal-label').text(text);

    // Create left panel svg
    var svgLeft = d3.select("#map")
        .append("svg")
        .attr("height", height + margin.top + margin.bottom)
        //.attr("width", width + margin.left + margin.right) // full-width map
        .attr("width", "100%") // constain map to width of its parent
        .append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    // Create right panel svg
    var svgRight = d3.select("#details")
        .append("svg")
        .attr("height", 40)
        .attr("width", "100%")
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
        svgLeft.selectAll(".country")
            .data(data)
            .enter() // Can only proceed if it can attach to something
            .append("path")
            .attr("class", function(d) {
                // Initialize some countries with colour
                if (d.status == "Added") {
                    return "country " + (d.timestamp < goal ? "visible" : "hidden");
                }
                if (d.status == "Prohibited") {
                    return "country " + (d.timestamp < goal ? "prohibited" : "hidden");
                }
                if (d.status == "Terminated") {
                    return "country " + (d.timestamp < goal ? "terminated" : "hidden");
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
                        if (d.status == "Prohibited") {
                            var date = new Date(goal * 1000);
                            var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                            return d.properties.name + " (" + d.provider + ", " + dateText +" Prohibited"+ ")";
                        }
                        if (d.status == "Terminated") {
                            var date = new Date(goal * 1000);
                            var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                            return d.properties.name + " (" + d.provider + ", " + dateText +" Terminated"+ ")";
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
        svgLeft.selectAll(".country-label")
        .data(data)
        .enter()
        .append("text")
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
        .attr("class", function(d){
            // Prevent labels from going off-map, by changing text-anchor: end or start
            var coords = (d.geometry.coordinates[0][0][0][0] == undefined) ? 
            projection([d.geometry.coordinates[0][0][0], d.geometry.coordinates[0][0][1]]) : 
            projection([d.geometry.coordinates[0][0][0][0], d.geometry.coordinates[0][0][0][1]]);
            return (coords[0] > 300) ? "country-label label-right" : "country-label label-left";
        })
        .html(function(d) {
            return d.properties.name;
        });

        // Populate right panel
        svgRight.selectAll(".detail");
        
        // Add the goal
        d3.select("#goal").on("input", function() {
            goal = +this.value;
            d3.select('#goal-value').text(goal);
            svgLeft.selectAll("svg path").each(function(d) { 
                // Change class
                if (d.status == "Added") {
                    this.classList.add(d.timestamp < goal ? "visible" : "hidden");
                    this.classList.remove(d.timestamp < goal ? "hidden" : "visible");
                    // Update label
                    var d = new Date(goal * 1000);
                    var text =  d.getFullYear() + '/' +  ((d.getMonth()+1 < 10) ? ("0")+(d.getMonth()+1) : d.getMonth()+1) + '/' + ((d.getDate() < 10) ? ("0")+(d.getDate()) : d.getDate());
                    d3.select('#goal-label').text(text);
                }
                if (d.status == "Prohibited") {
                    this.classList.add(d.timestamp < goal ? "prohibited" : "hidden");
                    this.classList.remove(d.timestamp < goal ? "hidden" : "prohibited");
                    // Update label
                    var d = new Date(goal * 1000);
                    var text =  d.getFullYear() + '/' +  ((d.getMonth()+1 < 10) ? ("0")+(d.getMonth()+1) : d.getMonth()+1) + '/' + ((d.getDate() < 10) ? ("0")+(d.getDate()) : d.getDate());
                    d3.select('#goal-label').text(text);
                }
                if (d.status == "Terminated") {
                    this.classList.add(d.timestamp < goal ? "terminated" : "hidden");
                    this.classList.remove(d.timestamp < goal ? "hidden" : "terminated");
                    // Update label
                    var d = new Date(goal * 1000);
                    var text =  d.getFullYear() + '/' +  ((d.getMonth()+1 < 10) ? ("0")+(d.getMonth()+1) : d.getMonth()+1) + '/' + ((d.getDate() < 10) ? ("0")+(d.getDate()) : d.getDate());
                    d3.select('#goal-label').text(text);
                }
            }); // End each()
        }); // End select()
    } // End ready()
})();