/******************************************************************************

Copyright (c) 2016, Highsoft

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT,
TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

******************************************************************************/

/* The main chart editor object 
 * @parent - the node to attach the editor to
 * @attributes - the editor settings
 * @returns an instance of an editor
 */
highed.Editor = function (parent, attributes) {
    var events = highed.events(),
        customizedOptions = {},
        exports = {
            customizedOptions: customizedOptions,
            flatOptions: {}
        },

        properties = highed.merge({

        }, attributes),

        container = highed.dom.cr('div', 'highed-container'),

        mainToolbar = highed.Toolbar(container, {
            additionalCSS: ['highed-header']
        }),

        splitter = highed.HSplitter(container, {leftWidth: 60}),

        wizbar = highed.WizardBar(container, splitter.left),

        dataImp = highed.DataImporter(wizbar.addStep({title: 'Import'}).body),
    
        chartTemplateSelector = highed.ChartTemplateSelector(wizbar.addStep({title: 'Templates'}).body),
        chartContainer = highed.dom.cr('div', 'highed-box-size highed-chart-container'),

        chartCustomizer = highed.ChartCustomizer(wizbar.addStep({title: 'Customize'}).body, exports),


        chart = new Highcharts.Chart({
            chart: {
                type: 'bar',
                renderTo: chartContainer                
            }
        }),

        cleanOptions = highed.merge({}, chart.options)
    ;

    ///////////////////////////////////////////////////////////////////////////
    
    /* Resize the editor */
    function resize() {
        var cs = highed.dom.size(container),
            ms = highed.dom.size(mainToolbar.container),
            wb = highed.dom.size(wizbar.container)
        ;

        //wizbar.resize(undefined, cs.h - ms.h - wb.h);
        chartCustomizer.resize(undefined, cs.h - ms.h - wb.h);
        chartTemplateSelector.resize(undefined, cs.h - ms.h - wb.h);
        splitter.resize(cs.w, cs.h - ms.h - wb.h);
        chart.reflow();
        events.emit('Resized');
    }

    function getEmbeddableHTML() {
        var id = 'chart',
            jsIncludes = [
                'https://code.highcharts.com/highcharts.js',
                'http://code.highcharts.com/adapters/standalone-framework.js',
                'https://code.highcharts.com/highcharts-more.js',
                'https://code.highcharts.com/highcharts-3d.js',
                'https://code.highcharts.com/modules/data.js'
            ],
            cssIncludes = [
                'https://maxcdn.bootstrapcdn.com/font-awesome/4.4.0/css/font-awesome.min.css'
            ]
        ;

        return [
            '<iframe><html><head>',

            //Write JS includes
            jsIncludes.map(function (include) {
                return '<script src="' + include + '"></script>';
            }).join(''),

            //Write instancer
            '<script>',
            '(function(){',
            'new Highcharts.chart("', id, '", JSON.parse(\'', 
                JSON.stringify(highed.merge(highed.merge({}, chart.options), {chart: {renderTo: id}})), '\'));',
            '})();',
            '</script></head><body><div id="' + id + '"></div></body></html></iframe>'

        ].join('');
    }

    ///////////////////////////////////////////////////////////////////////////

    //Attach to parent node
    parent = highed.dom.get(parent);
    if (parent) {
        highed.dom.ap(parent, 
            container                           
        );

        highed.dom.ap(splitter.right, 
            chartContainer
        );

        highed.dom.ap(mainToolbar.left,
            highed.dom.cr('div', 'highed-logo')
        );

        resize();
    } else {
        highed.log(1, 'no valid parent supplied to editor');
    }

    highed.dom.on(window, 'resize', resize);

    highed.dom.ap(mainToolbar.right,
        highed.dom.cr('span', 'highed-credits', 'Highcharts Editor Beta')
    );

    ///////////////////////////////////////////////////////////////////////////
    
    //Handle chart template selection
    chartTemplateSelector.on('Select', function (template) {
        var options = highed.merge(highed.merge({}, cleanOptions), customizedOptions);

        Object.keys(template.config).forEach(function (key) {
            highed.setAttr(options, key, template.config[key]);
            exports.flatOptions[key] = template.config[key];
        });

        options.chart.renderTo = chartContainer;
        chart = new Highcharts.Chart(options);

        events.emit('ChartChange', options);

        resize();
    });

    //Handle property change
    chartCustomizer.on('PropertyChange', function (id, value) {
        highed.setAttr(chart.options, id, value);
        highed.setAttr(customizedOptions, id, value);
        highed.setAttr(chart.options, 'plotOptions--series--animation', false);

        exports.flatOptions[id] = value;

        chart = new Highcharts.Chart(chart.options);
        
        events.emit('ChartChange', chart.options);

        resize();
    });

    dataImp.on('ImportCSV', function (data) {
        if (!chart || !chart.options) {
            chart = {options: {}};
        }

        highed.setAttr([chart.options, cleanOptions], 'plotOptions--series--animation', true);
        highed.setAttr([chart.options, cleanOptions], 'data--csv', data.csv);
        highed.setAttr([chart.options, cleanOptions], 'data--itemDelimiter', data.itemDelimiter);
        highed.setAttr([chart.options, cleanOptions], 'data--firstRowAsNames', data.firstRowAsNames);
        highed.setAttr([chart.options, cleanOptions], 'data--dateFormat', data.dateFormat);
        highed.setAttr([chart.options, cleanOptions], 'data--decimalPoint', data.decimalPoint);
        highed.setAttr([chart.options, cleanOptions], 'series', {});

        chartContainer.innerHTML = '';

        chart = new Highcharts.Chart(chart.options);
        
        events.emit('ChartChange', chart.options);

        resize();
    });

    ///////////////////////////////////////////////////////////////////////////

    //Public interface
 
    /* Attach an event listener
     * @event - the event to listen for
     * @callback - the callback to execute when the event is emitted
     * @context (optional) - the value of the this reference in the callback
     *
     * @returns a function that can be called to unbind the listener
     */
    exports.on = events.on;
    /* Force a resize of the editor */
    exports.resize = resize;
    /* Get embeddable javascript */
    exports.getEmbeddableHTML = getEmbeddableHTML;
    
    return exports;
};