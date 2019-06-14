var svg = d3.select("body").append('svg')
    .attr("width", 1000)
    .attr("height", 660);

d3.json("data/data.json", function (error, data) {
    var categories = d3.keys(data[0].words);
    drawWordStream(svg, data, categories, 10, 30, 10)
});
var spinner;
function drawWordStream(svg, data, thiscategories, minFont, maxFont, topWord) {
    let globalWidth = +svg.attr("width"),
        globalHeight = +svg.attr("height"),
        globalMinFont = minFont,
        globalMaxFont = maxFont,
        globalTop = topWord,
        globalFlag = "n",
        categories = thiscategories;

    const color = d3.scaleOrdinal(d3.schemeCategory10);
    var opacity, maxFreq, minFreq;

    var axisGroup = svg.append('g').attr("id", "axisGroup");
    var xGridlinesGroup = svg.append('g').attr("id", "xGridlinesGroup");
    var mainGroup = svg.append('g').attr("id", "main");
    var legendGroup = svg.append('g').attr("id", "legend");

    var opts = {
        lines: 12, // The number of lines to draw
        length: 18, // The length of each line
        width: 10, // The line thickness
        radius: 20, // The radius of the inner circle
        color: ["#f9b1b6", "#f9e08b", "#95d5ee"], // #rgb or #rrggbb or array of colors
        speed: 1.5, // Rounds per second
        trail: 50, // Afterglow percentage
        className: 'spinner', // The CSS class to assign to the spinner
    };

    var target = document.getElementById('loadingSpinner');
    spinner = new Spinner(opts).spin(target);

    // END: loader spinner settings ****************************

    draw(data);

    function draw(data) {
        //Layout data
        var font = "Arial";
        const axisPadding = 10;
        const legendFontSize = 12;
        const legendOffset = 10;
        var legendHeight = categories.length * legendFontSize;

        const margins = {left: 20, top: 20, right: 10, bottom: 30};
        var width = globalWidth - (margins.left + margins.top);
        var height = globalHeight - (+margins.top + margins.bottom + axisPadding + legendHeight);
        var ws = d3.wordStream()
            .size([width, height])
            .fontScale(d3.scaleLinear())
            .minFontSize(globalMinFont)
            .maxFontSize(globalMaxFont)
            .data(data)
            .flag(globalFlag)
            .categories(categories)
        ;
        var boxes = ws.boxes();
        maxFreq = ws.maxFreq();
        minFreq = ws.minFreq();

        var area = d3.area()
            .curve(d3.curveCardinal)
            .x(function (d) {
                return (d.data.x);
            })
            .y0(function (d) {
                return d[0];
            })
            .y1(function (d) {
                return d[1];
            });

        //Display time axes
        var dates = [];
        boxes.data.forEach(row => {
            dates.push(row.date);
        });

        var xAxisScale = d3.scaleBand().domain(dates).rangeRound([0, width]);
        var xAxis = d3.axisBottom(xAxisScale);

        axisGroup
            .attr('transform', 'translate(' + (margins.left) + ',' + (height + margins.top + axisPadding + legendHeight) + ')');
        var axisNodes = axisGroup.call(xAxis);
        styleAxis(axisNodes);

        //Display the vertical gridline
        var xGridlineScale = d3.scaleBand().domain(d3.range(0, dates.length + 1)).rangeRound([0, width + width / boxes.data.length]);
        var xGridlinesAxis = d3.axisBottom(xGridlineScale);

        xGridlinesGroup.attr('transform', 'translate(' + (margins.left - width / boxes.data.length / 2) + ',' + (height + margins.top + axisPadding + legendHeight + margins.bottom) + ')');
        var gridlineNodes = xGridlinesGroup
            .call(xGridlinesAxis
                .tickSize(-height - axisPadding - legendHeight - margins.bottom, 0, 0)
                .tickFormat(''));
        styleGridlineNodes(gridlineNodes);

        //Main group
        mainGroup.attr('transform', 'translate(' + margins.left + ',' + margins.top + ')');
        var wordStreamG = mainGroup.append('g').attr("id", "wordStreamG");

        // draw curves
        var topics = boxes.topics;

        var curve = mainGroup.selectAll('.curve').data(boxes.layers);

        curve.exit().remove();

        curve.enter()
            .append('path')
            .attr('d', area)
            .style('fill', function (d, i) {
                return color(i);
            })
            .attr("class", "curve")
            .attr('fill-opacity', 0)
            .attr("stroke", "black")
            .attr('stroke-width', 0)
            .attr("topic", (d, i) => topics[i]);

        curve.attr("d", area)
            .style('fill', function (d, i) {
                return color(i);
            })
            .attr('fill-opacity', 0)
            .attr("stroke", "black")
            .attr('stroke-width', 0)
            .attr("topic", (d, i) => topics[i]);

        var allWords = [];
        d3.map(boxes.data, function (row) {
            boxes.topics.forEach(topic => {
                allWords = allWords.concat(row.words[topic]);
            });
        });

        opacity = d3.scaleLog()
            .domain([minFreq, maxFreq])
            .range([0.4, 1]);

        var prevColor;

        var texts = mainGroup.selectAll('.word').data(allWords, d => d.id);

        texts.exit().remove();

        var textEnter = texts.enter().append('g')
            .attr("transform", function (d) {
                return 'translate(' + d.x + ', ' + d.y + ')rotate(' + d.rotate + ')';
            })
            .attr("class", "word")
            .append('text');

        textEnter
            .text(function (d) {
                return d.text;
            })
            .attr("id", d => d.id,)
            .attr("class", "textData")
            .attr('font-family', font)
            .attr('font-size', function (d) {
                return d.fontSize;
            })
            .attr("fill", function (d, i) {
                return color(categories.indexOf(d.topic));
            })
            .attr("fill-opacity", function (d) {
                return opacity(d.frequency);
            })
            .attr('text-anchor', 'middle')
            .attr('alignment-baseline', 'middle')
            .attr("topic", function (d) {
                return d.topic;
            })
            .attr("visibility", function (d) {
                return d.placed ? "visible" : "hidden";
            });

        texts.transition().duration(800)
            .attr("transform", function (d) {
                return 'translate(' + d.x + ', ' + d.y + ')rotate(' + d.rotate + ')';
            })

            .select("text")
            .attr('font-size', function (d) {
                return d.fontSize;
            })
            .attr("visibility", function (d) {
                return d.placed ? "visible" : "hidden"
            });

        //Highlight
        mainGroup.selectAll('.textData').on('mouseenter', function () {
            var thisText = d3.select(this);
            thisText.style('cursor', 'pointer');
            prevColor = thisText.attr('fill');
            var text = thisText.text();
            var topic = thisText.attr('topic');
            var allTexts = mainGroup.selectAll('.textData').filter(t => {
                return t && t.text === text && t.topic === topic;
            });
            allTexts
                .attr("stroke", prevColor)
                .attr("stroke-width", 1);
        });
        mainGroup.selectAll('.textData').on('mouseout', function () {
            var thisText = d3.select(this);
            thisText.style('cursor', 'default');
            var text = thisText.text();
            var topic = thisText.attr('topic');
            var allTexts = mainGroup.selectAll('.textData').filter(t => {
                return t && !t.cloned && t.text === text && t.topic === topic;
            });
            allTexts
                .attr("stroke", "none")
                .attr("stroke-width", 0);
        });
        //Click
        mainGroup.selectAll('.textData').on('click', function () {
            var thisText = d3.select(this);
            var text = thisText.text();
            var topic = thisText.attr('topic');
            var allTexts = mainGroup.selectAll('.textData').filter(t => {
                return t && t.text === text && t.topic === topic;
            })._groups;
            //Select the data for the stream layers
            var streamLayer = d3.select("path[topic='" + topic + "']").data()[0];
            //Push all points
            var points = Array();
            //Initialize all points
            streamLayer.forEach((elm, i) => {
                let item = [];
                item[0] = elm[1];
                item[1] = elm[1];
                item.data = elm.data;
                points.push(item);
            });
            allTexts[0].forEach(t => {
                var data = t.__data__;
                var fontSize = data.fontSize;
                //The point
                var thePoint = points[data.timeStep + 1];
                //+1 since we added 1 to the first point and 1 to the last point.
                thePoint[1] = thePoint[0] - data.streamHeight;
                //Set it to visible.
                //Clone the nodes.
                var clonedNode = t.cloneNode(true);
                d3.select(clonedNode)
                    .attr("visibility", "visible")
                    .attr("stroke", 'none')
                    .attr("stroke-size", 0);

                var clonedParentNode = t.parentNode.cloneNode(false);
                clonedParentNode.appendChild(clonedNode);

                t.parentNode.parentNode.appendChild(clonedParentNode);
                d3.select(clonedParentNode)
                    .attr("cloned", true)
                    .attr("topic", topic)
                    .transition().duration(300)
                    .attr("transform", function (d, i) {
                        return 'translate(' + thePoint.data.x + ',' + (thePoint[1] - fontSize / 2) + ')';
                    });
            });
            //Add the first and the last points
            points[0][1] = points[1][1];//First point
            points[points.length - 1][1] = points[points.length - 2][1];//Last point
            //Append stream
            wordStreamG.append('path')
                .datum(points)
                .attr('d', area)
                .style('fill', prevColor)
                .attr("fill-opacity", 1)
                .attr("stroke", 'black')
                .attr('stroke-width', 0.3)
                .attr("topic", topic)
                .attr("wordStream", true);
            //Hide all other texts
            var allOtherTexts = mainGroup.selectAll('.textData').filter(t => {
                return t && !t.cloned && t.topic === topic;
            });
            allOtherTexts.attr('visibility', 'hidden');
        });
        topics.forEach(topic => {
            d3.select("path[topic='" + topic + "']").on('click', function () {
                mainGroup.selectAll('.textData').filter(t => {
                    return t && !t.cloned && t.placed && t.topic === topic;
                })
                    .attr("visibility", "visible");
                //Remove the cloned element
                document.querySelectorAll("g[cloned='true'][topic='" + topic + "']").forEach(node => {
                    node.parentNode.removeChild(node);
                });
                //Remove the added path for it
                document.querySelectorAll("path[wordStream='true'][topic='" + topic + "']").forEach(node => {
                    node.parentNode.removeChild(node);
                });
            });

        });

        //Build the legends
        legendGroup.attr('transform', 'translate(' + margins.left + ',' + (height + margins.top + legendOffset) + ')');
        var legendNodes = legendGroup.selectAll('g').data(boxes.topics).enter().append('g')
            .attr('transform', function (d, i) {
                return 'translate(' + 10 + ',' + (i * legendFontSize) + ')';
            });
        legendNodes.append('circle')
            .attr("r", 5)
            .attr("fill", (d, i) => color(i))
            .attr('fill-opacity', 1)
            .attr("stroke", "black")
            .attr("stroke-width", 0.5);

        legendNodes.append('text')
            .text(d => d)
            .attr('font-size', legendFontSize)
            .attr('alignment-baseline', "middle")
            .attr("dx", 8);
    }
    spinner.stop();
}

function styleAxis(axisNodes) {
    axisNodes.selectAll('.domain')
        .attr("fill", "none")
        .attr("stroke-opacity", 0);

    axisNodes.selectAll('.tick line')
        .attr("fill", "none")
        .attr("stroke-opacity", 0);

    axisNodes.selectAll('.tick text')
        .attr('font-family', 'serif')
        .attr('font-size', 15);
}

function styleGridlineNodes(gridlineNodes) {
    gridlineNodes.selectAll('.domain')
        .attr("fill", "none")
        .attr("stroke", "none");

    gridlineNodes.selectAll('.tick line')
        .attr("fill", "none")
        .attr("stroke-width", 0.7)
        .attr("stroke", 'lightgray');
}