$(function () {

   // Chrome Viewbox Logic ==============================================================================================
   $('.chrome-handle').on('mousedown', function (e) {
       var chrome = $(this).parents('.chrome');
       $('body').data('active-chrome-handle', { target: $(this), X: e.clientX, Y: e.clientY, width: chrome.width(), height: chrome.height() });
   });
   $(window).on('mouseup', function () {
       var handle = $('body').data('active-chrome-handle');
       if(handle){
           $('body').removeData('active-chrome-handle');
       }
   });

   $(window).on('mousemove', function (e) {
        var handle = $('body').data('active-chrome-handle');
        if(handle){
            if(handle.target.hasClass('top-left')){
                handle.target.parents('.chrome').width(handle.width + (handle.X - e.clientX)*2);
                handle.target.parents('.chrome').height(handle.height + (handle.Y - e.clientY)*2);
            }
            else if(handle.target.hasClass('top-right')){
                handle.target.parents('.chrome').width(handle.width + (e.clientX - handle.X)*2);
                handle.target.parents('.chrome').height(handle.height + (handle.Y - e.clientY)*2);
            }
            else if(handle.target.hasClass('bottom-left')){
                handle.target.parents('.chrome').width(handle.width + (handle.X - e.clientX)*2);
                handle.target.parents('.chrome').height(handle.height + (e.clientY -  handle.Y)*2);
            }
            else{
                handle.target.parents('.chrome').width(handle.width + (e.clientX - handle.X)*2);
                handle.target.parents('.chrome').height(handle.height + (e.clientY -  handle.Y)*2);
            }
        }
    });


   // Column Resize Logic =================================================================================================
    var _cancel = false
    var _min_column_size = 50
    $(window).on('mousemove', function (e) {
        var col1 = undefined,
            col2 = undefined,
            _t1 = 0,
            _t2 = 0,
            _deadzone = 10

        if($(e.target).parents('.table-component, tr').length === 2 && (!$('body').data('current_header_resize') || !$('body').data('current_header_resize')[ 0 ])) {
            var target = $(e.target).is('tr') ? $(e.target) : $(e.target).parents('tr')

            for (var x of target.find('th:not(:last-child)')) {
                _t1 = $(x).offset().left;
                _t2 = _t1 + $(x)[ 0 ].clientWidth;

                if ( e.clientX > _t1 && e.clientX < _t2 ) {
                    if ( !$(x).is('th:nth-last-child(2)') && e.clientX > _t2 - _deadzone / 2 ) {
                        col2 = $(x).next()
                        col1 = $(x)
                    }
                    else if ( !$(x).is('th:first-child') && e.clientX < _t1 + _deadzone / 2 ) {
                        col2 = $(x)
                        col1 = $(x).prev()
                    }
                    break
                }
            }
        }

        var g = $('body').data('current_header_resize');

        if ( col1 && col2 && !g ) {
            col1.toggleClass('resizable-left', true)
            col2.toggleClass('resizable-right', true)
            $('body').data('current_header_resize', [ false, col1, col2, col1[0].clientWidth, col2[0].clientWidth, target ])
        }
        else if (!col1 && !col2 && $('body').data('current_header_resize') && !g[ 0 ] ) {
            g[1].toggleClass('resizable-left', false).toggleClass('resizable-right', false)
            g[2].toggleClass('resizable-left', false).toggleClass('resizable-right', false)
            $('body').removeData('current_header_resize')
            _cancel = false
        }

        // Непосредственная логика ресайза
        if(g && g[ 0 ]){ //_min_column_size
            _t1 = e.clientX - g[0]
            var col1_width = g[3] + _t1,
                col2_width = g[4] - _t1
            _t1 = g[5][0].clientWidth

            if(col1_width > _min_column_size && col2_width > _min_column_size) {
                var ev = new Event('onColumnResize')
                ev.target = e.target
                ev.additionalData = { column1: [g[1].index(),((col1_width * 100) /_t1 + 0.0).toFixed(4)], column2: [g[2].index(), ((col2_width * 100) /_t1 + 0.0).toFixed(4)] }
                g[1].parents('.table-component')[0].dispatchEvent(ev)
            }
        }

    }).on('mousedown', function (e) {
        var g = $('body').data('current_header_resize');
        if(g && !g[0]){
            _cancel = true
            $('body').data('current_header_resize', [e.clientX || true, ...g.slice(1)])

        }
    }).on('mouseup', function (e) {
        var g = $('body').data('current_header_resize');
        if(g){
            g[1].toggleClass('resizable-left', false).toggleClass('resizable-right', false)
            g[2].toggleClass('resizable-left', false).toggleClass('resizable-right', false)
            $('body').removeData('current_header_resize')
            _cancel = false
        }
    });


    // Column Reordering Logic ==================================================================================================================
    $(window).on('click',function (e) {
        var g = $('body').data('current_header_moved');

        if(g === false) {
            if ($(e.target).is('label') && $(e.target.parentNode).is('th') ) {
                e.preventDefault()
            }
        }
    }).on('mousedown', function (e) {
        var target = undefined;

        if($(e.target).parents('.table-component').length === 0 || _cancel) {
            return;
        }

        if($(e.target).is('th:not(:last-child)')) {
            target = $(e.target);
        }
        else if($(e.target).is('th:not(:last-child)>label')){
            target = $(e.target.parentNode);
        }
        else return;


        if(target){
            var _row = target.parent();
            var maxX = _row[0].clientWidth - _row.children('th:last-child')[0].clientWidth - target[0].clientWidth - 1;

            $('body').data('current_header_moved', { initial: true, source: target, target: undefined, contWidth: _row[0].clientWidth, maxX : maxX, X: target.position().left, Xpoint: e.clientX });
            target.toggleClass('move', true);
        }
    }).on('mouseup', function (e) {
        var g = $('body').data('current_header_moved');

        if(typeof g === 'object') {
            g.source.toggleClass('move', false).css('left','').siblings().toggleClass('move_target_right', false).toggleClass('move_target_left', false);

            if(g.target){
                var ev = new Event('onOrderChanged')
                ev.target = e.target
                ev.additionalData = { _old: g.source.index(), _new: g.target.index() }
                g.target.parents('.table-component')[0].dispatchEvent(ev)
            }

            $('body').data('current_header_moved', g.initial)  // защита плитки от click при перетаскивании (чтобы не активировался checkbox)
        }
    }).on('mousemove', function (e) {
        var g = $('body').data('current_header_moved');

        if(typeof g === 'object'){
            if(g.initial === true) {
                g.initial = false
            }

            var alpha = e.clientX - g.Xpoint
            var beta = g.X + alpha
            var beta2 = alpha < 0 ? beta : g.source[0].clientWidth + beta

            if(beta > 0 && beta < g.maxX && beta !== 0){
                g.source.css('left',Number.parseFloat((alpha * 100) / g.contWidth).toFixed(4) + '%');

                //определяем цель
                var _t1 = 0, _t2 = 0

                g.source.siblings().each((i,x)=>{
                    $(x).toggleClass('move_target_left',false).toggleClass('move_target_right', false)

                    _t1 = $(x).position().left
                    _t2 = Math.min($(x)[0].clientWidth, g.source[0].clientWidth)/2

                    // Определение "мертвой зоны"
                    if(_t1 < beta2 && _t1 + $(x)[0].clientWidth > beta2 && Math.abs(alpha) > _t2){
                        //g.target - target
                        //g.source - current
                        g.target = $(x);

                        $(x).toggleClass(alpha < 0 ? 'move_target_left' : 'move_target_right', true)
                    }
                    else if(Math.abs(alpha) < _t2){
                        g.target = undefined
                    }
                });

            }
        }
    });


});