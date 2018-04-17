// Self invoking function
(function() {
    
    var selectedStatus;
    var selectedYear = 0;
    var selectedTerminatedYear = 0;
    var selectedLabel = "";
    var details;
    var centered;

    // Trim Antarctica from map
    var offset = 200;

    // Set margins
    var margin = { top: 0, left: 0, right: 0, bottom: 0},
    height = 660 - offset - margin.top - margin.bottom,
    width = 630 - margin.left - margin.right
    goal = 1420070400;

    // Datetime (2014/01/01 by default)
    var d = new Date(goal * 1000);
    var text =  d.getFullYear() + '/' +  (d.getMonth()+1 < 10 ? "0"+d.getMonth()+1 : d.getMonth()+1) + '/' + d.getDate();
    d3.select('#goal-label').text(text);

    // Create left panel svg
    var svg = d3.select("#map")
        .append("svg")
        .attr("height", height + margin.top + margin.bottom)
        //.attr("width", width + margin.left + margin.right) // full-width map
        .attr("width", "100%") // constain map to width of its parent
   
    // second map
    var map_svg=d3.select("#second_map")
        .append("svg")
        .attr("height", height+margin.top+margin.bottom)
        .attr("width", "100%")
    
    var g = svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    var g_map= map_svg.append("g")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
    
        // Create right panel svg
    var rightPanel = d3.select("#charts")
        .append("div")
        .attr("class", "container");

        // No country selected
        rightPanel.append("div")
            .attr("class", "details")
            .append("h3")
            .text("No country selected.");
    var second_rightPanel = d3.select("#second_charts")
            .append("div")
            .attr("class", "container");

            // No country selected
            rightPanel.append("div")
                .attr("class", "details")
                .append("h3")
                .text("No country selected.");

    // Read in topojson data using the d3.json processor
    d3.queue()
        .defer(d3.json, "data/countries.json") // var countries
        .defer(d3.csv, "data/data.csv") // var data_unformatted
        .await(ready);

    // Translate between a round globe and flat screen
    var projection = d3.geoMercator()
        .rotate([115, 0]) // Center map around Canada
        .translate([ width / 2, height / 2 + offset / 2 ]) // Center it
        .scale(100); // Zoom 100%

    // Create a path and set its projection
    var path = d3.geoPath()
        .projection(projection);

    // Programatically generate a chart in the right panel
    function generateChart(title, data_array, column_array) {

        // Add chart title
        details.append("h4")
            .text(title);

        // Add slider
        var heightChart = 90;
        var widthChart = 340;

        // Set slider range
        var xChart = d3.scaleBand()
            .range([0, widthChart])
            .padding(0.1);
        var xChartYear = d3.scaleBand()
            .range([0, widthChart])
            .padding(0.1);
        var yChart = d3.scaleLinear()
            .range([heightChart, 0]);

        // Append an SVG object to the body element
        var svgChart = details.append('svg')
            .attr('width', widthChart + 30)
            .attr('height', heightChart + 15)
            .append('g')
            .attr('transform', 'translate(' + 25 + ',' + 0 + ')');

        // Format the data
        data_array.forEach(function(d) {
            d = +d; // Use unary plus operator (+) to convert strings to numbers
        });

        // Scale the range of the data in the domains
        xChart.domain(data_array.map(function(d) {
            return d;
        }));
        xChartYear.domain(column_array.map(function(d) {
            return d;
        }));
        yChart.domain([0, d3.max(data_array, function(d) {
            return +d;
        })]);

        // Append the rectangles for the bar chart
        svgChart.selectAll(".bar")
            .data(data_array)
            .enter().append("rect")
            .attr("class", function(f, i){
                // Display grey or green bar, based on introduction of service
                if (selectedStatus == "Prohibited") return "bar bar-prohibited";
                if (selectedTerminatedYear > 0 && column_array[i] >= selectedTerminatedYear) return "bar bar-terminated";
                if (selectedYear == 0) return "bar";
                return (column_array[i] >= selectedYear) ? "bar bar-after" : "bar bar-before";
            })
            .attr("x", function(d) {
                return xChart(d);
            })
            .attr("width", xChart.bandwidth())
            .attr("y", function(d) {
                return yChart(d);
            })
            .attr("height", function(d) {
                return heightChart - yChart(d);
            });
        // Add the x Axis
        svgChart.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + heightChart + ")")
            .call(d3.axisBottom(xChart))
            .selectAll("text")
            .attr("y", function(d, i) {return -heightChart + 10 + yChart(d)})
            .attr("x", 0)
            .attr("dy", ".35em");

        // Add the x Year helper axis
        svgChart.append("g")
            .attr("class", "x-axis")
            .attr("transform", "translate(0," + heightChart + ")")
            .call(d3.axisBottom(xChartYear))
            .selectAll("text")
            .attr("y", 10)
            .attr("x", 0)
            .attr("dy", ".35em")
        
        // Add the y Axis
        svgChart.append("g")
            .attr("class", "y-axis")
            .call(d3.axisLeft(yChart));
    }

    // Run once the DOM is ready
    // (error, defer1, defer2, ...)
    function ready(error, countries, csv) {

        // Extract countries from topojson and countries key
        var features = topojson.feature(countries, countries.objects.units).features;

        // Left join if country codes match, else return empty
        var data = features.map(function(d) {
            return Object.assign({}, d, csv.reduce(function(empty, join) {
                return (join.code === d.id) ? join : empty;
            }, {}))
        });

        // Store selected country
        var selected = null;
        var selectedId = '';
        
        

        // Add path for each country (shapes -> path)
        g.selectAll(".country")
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
                var x, y, k;

                if (d && centered !== d) {
                  var centroid = path.centroid(d);
                  x = centroid[0];
                  y = centroid[1];
                  k = 4;
                  centered = d;
                } else {
                  x = width / 2;
                  y = height / 2;
                  k = 1;
                  centered = null;
                }
              
                g.selectAll("path")
                    .classed("active", centered && function(d) { return d === centered; });
              
                g.transition()
                    .duration(750)
                    .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
                    .style("stroke-width", 1.5 / k + "px");

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
                        selectedTerminatedYear = 0;
                        selectedStatus = d.status;
                        if (d.status == "Added") {
                            var date = new Date(d.timestamp * 1000);
                            var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                            selectedLabel = d.properties.name + " (" + d.provider + ", " + dateText + ")";
                            selectedYear = date.getFullYear();
                            if (d.termination_timestamp > 0) {
                                var date = new Date(d.termination_timestamp * 1000);
                                selectedTerminatedYear = date.getFullYear();
                            }
                        }
                        else if (d.status == "Prohibited") {
                            var date = new Date(d.timestamp * 1000);
                            var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                            selectedLabel = d.properties.name + " (" + "Prohibited by Net Neutrality" + ")";
                            selectedYear = 0;
                        }
                        else if (d.status == "Terminated") {
                            var date = new Date(d.timestamp * 1000);
                            var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                            selectedLabel = d.properties.name + " (" + "Service Terminated" + ")";
                            selectedYear = 0;
                        }
                        else {
                            selectedLabel = d.properties.name + " (Not Available)";
                            selectedYear = 0;
                        }
                        

///////////////////////////////// START RIGHT PANEL /////////////////////////////////

                        // Clear the right panel
                        rightPanel.selectAll("div").remove();
                        details = rightPanel.append("div").attr("class", "details");
                        var title;
                        var data_array;
                        var range;

                        // Set selected country title
                        details.append("h3").text(selectedLabel);

                        // Generate Population using Internet Chart
                        title = "% of population using the Internet";
                        data_array = [d.individual_net_usage_2009,d.individual_net_usage_2010,d.individual_net_usage_2011,d.individual_net_usage_2012,d.individual_net_usage_2013,d.individual_net_usage_2014,d.individual_net_usage_2015,d.individual_net_usage_2016];
                        range = ["2009","2010","2011","2012","2013","2014","2015","2016"];
                        generateChart(title, data_array, range);

                        // Generate Mobile Subscriptions Chart
                        title = "Mobile Subscriptions per 100 people";
                        data_array = [d.mobile_subscriptions_2009,d.mobile_subscriptions_2010,d.mobile_subscriptions_2011,d.mobile_subscriptions_2012,d.mobile_subscriptions_2013,d.mobile_subscriptions_2014,d.mobile_subscriptions_2015,d.mobile_subscriptions_2016];
                        range = ["2009","2010","2011","2012","2013","2014","2015","2016"];
                        generateChart(title, data_array, range);

                        // GDP SVG
                        title = "Gross Domestic Product ($USD Billions)";
                        data_array = [d.gdp_2009,d.gdp_2010,d.gdp_2011,d.gdp_2012,d.gdp_2013,d.gdp_2014,d.gdp_2015,d.gdp_2016];
                        range = ["2009","2010","2011","2012","2013","2014","2015","2016"];
                        generateChart(title, data_array, range);

///////////////////////////////// END RIGHT PANEL /////////////////////////////////
                        if (centered == null)
                        return d.properties.name;
                    });
                
                // If you click on the same country twice, deselect
                if (selectedId == d.id) {
                    if (selected != null) {
                        // Clear the right panel
                        rightPanel.selectAll("div").remove();
                        rightPanel.append("div")
                        .attr("class", "details")
                        .append("h3")
                        .text("No country selected.");
                        // Deselect current country
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
        .attr("id", function(d) {
            return d.id;
        })
        .attr("x", function(d) {
            // Get x coordinate based on shape type (3d vs 4d)
            var coords = (d.geometry.coordinates[0][0][0][0] == undefined) ? 
                projection([d.geometry.coordinates[0][0][0], d.geometry.coordinates[0][0][1]]) : 
                projection([d.geometry.coordinates[0][0][0][0], d.geometry.coordinates[0][0][0][1]]);
            return coords[0] - 10;
        })
        .attr("y", function(d) {
            // Get y coordinate based on shape type (3d vs 4d)
            var coords = (d.geometry.coordinates[0][0][0][0] == undefined) ? 
                projection([d.geometry.coordinates[0][0][0], d.geometry.coordinates[0][0][1]]) : 
                projection([d.geometry.coordinates[0][0][0][0], d.geometry.coordinates[0][0][0][1]]);
            return coords[1] - 10;
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
        
        // Add the goal
        d3.select("#goal").on("input", function() {
            goal = +this.value;
            d3.select('#goal-value').text(goal);
            
        }); // End select()



          // Add path for each country (shapes -> path)
          g_map.selectAll(".country")
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
              var x, y, k;

              if (d && centered !== d) {
                var centroid = path.centroid(d);
                x = centroid[0];
                y = centroid[1];
                k = 4;
                centered = d;
              } else {
                x = width / 2;
                y = height / 2;
                k = 1;
                centered = null;
              }
            
              g_map.selectAll("path")
                  .classed("active", centered && function(d) { return d === centered; });
            
              g_map.transition()
                  .duration(750)
                  .attr("transform", "translate(" + width / 2 + "," + height / 2 + ")scale(" + k + ")translate(" + -x + "," + -y + ")")
                  .style("stroke-width", 1.5 / k + "px");

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
                      selectedTerminatedYear = 0;
                      selectedStatus = d.status;
                      if (d.status == "Added") {
                          var date = new Date(d.timestamp * 1000);
                          var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                          selectedLabel = d.properties.name + " (" + d.provider + ", " + dateText + ")";
                          selectedYear = date.getFullYear();
                          if (d.termination_timestamp > 0) {
                              var date = new Date(d.termination_timestamp * 1000);
                              selectedTerminatedYear = date.getFullYear();
                          }
                      }
                      else if (d.status == "Prohibited") {
                          var date = new Date(d.timestamp * 1000);
                          var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                          selectedLabel = d.properties.name + " (" + "Prohibited by Net Neutrality" + ")";
                          selectedYear = 0;
                      }
                      else if (d.status == "Terminated") {
                          var date = new Date(d.timestamp * 1000);
                          var dateText =  date.getFullYear() + '/' +  ((date.getMonth()+1 < 10) ? ("0")+(date.getMonth()+1) : date.getMonth()+1) + '/' + ((date.getDate() < 10) ? ("0")+(date.getDate()) : date.getDate());
                          selectedLabel = d.properties.name + " (" + "Service Terminated" + ")";
                          selectedYear = 0;
                      }
                      else {
                          selectedLabel = d.properties.name + " (Not Available)";
                          selectedYear = 0;
                      }
                      

///////////////////////////////// START RIGHT PANEL /////////////////////////////////

                      // Clear the right panel
                      second_rightPanel.selectAll("div").remove();
                      details = second_rightPanel.append("div").attr("class", "details");
                      var title;
                      var data_array;
                      var range;

                      // Set selected country title
                      details.append("h3").text(selectedLabel);

                      // Generate Population using Internet Chart
                      title = "% of population using the Internet";
                      data_array = [d.individual_net_usage_2009,d.individual_net_usage_2010,d.individual_net_usage_2011,d.individual_net_usage_2012,d.individual_net_usage_2013,d.individual_net_usage_2014,d.individual_net_usage_2015,d.individual_net_usage_2016];
                      range = ["2009","2010","2011","2012","2013","2014","2015","2016"];
                      generateChart(title, data_array, range);

                      // Generate Mobile Subscriptions Chart
                      title = "Mobile Subscriptions per 100 people";
                      data_array = [d.mobile_subscriptions_2009,d.mobile_subscriptions_2010,d.mobile_subscriptions_2011,d.mobile_subscriptions_2012,d.mobile_subscriptions_2013,d.mobile_subscriptions_2014,d.mobile_subscriptions_2015,d.mobile_subscriptions_2016];
                      range = ["2009","2010","2011","2012","2013","2014","2015","2016"];
                      generateChart(title, data_array, range);

                      // GDP SVG
                      title = "Gross Domestic Product ($USD Billions)";
                      data_array = [d.gdp_2009,d.gdp_2010,d.gdp_2011,d.gdp_2012,d.gdp_2013,d.gdp_2014,d.gdp_2015,d.gdp_2016];
                      range = ["2009","2010","2011","2012","2013","2014","2015","2016"];
                      generateChart(title, data_array, range);

///////////////////////////////// END RIGHT PANEL /////////////////////////////////
                      if (centered == null)
                      return d.properties.name;
                  });
              
              // If you click on the same country twice, deselect
              if (selectedId == d.id) {
                  if (selected != null) {
                      // Clear the right panel
                      second_rightPanel.selectAll("div").remove();
                      second_rightPanel.append("div")
                      .attr("class", "details")
                      .append("h3")
                      .text("No country selected.");
                      // Deselect current country
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
      map_svg.selectAll(".country-label")
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
          return coords[0] - 10;
      })
      .attr("y", function(d) {
          // Get y coordinate based on shape type (3d vs 4d)
          var coords = (d.geometry.coordinates[0][0][0][0] == undefined) ? 
              projection([d.geometry.coordinates[0][0][0], d.geometry.coordinates[0][0][1]]) : 
              projection([d.geometry.coordinates[0][0][0][0], d.geometry.coordinates[0][0][0][1]]);
          return coords[1] - 10;
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
      
      // Add the goal
      d3.select("#goal").on("input", function() {
          goal = +this.value;
          d3.select('#goal-value').text(goal);
          map_svg.selectAll("svg path").each(function(d) { 
              // Change class
              if (d.status == "Added") {
                  (d.termination_timestamp > 0 && d.termination_timestamp < goal) ? this.classList.add("terminated") : this.classList.remove("terminated");
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
          svg.selectAll("svg path").each(function(d) { 
            // Change class
            if (d.status == "Added") {
                (d.termination_timestamp > 0 && d.termination_timestamp < goal) ? this.classList.add("terminated") : this.classList.remove("terminated");
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