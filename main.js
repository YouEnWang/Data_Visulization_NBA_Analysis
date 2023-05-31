// 這次code比較複雜
// 要重新仔細看影片!!!

// // 寫function
// 寫法: function('要傳入的資料')
// Data utilities
// 最麻煩的部分，要把csv改成javascript看得懂的東西
// 目前導入的object都被當成string

// // deal with empty value
// 遇到NA就設定為'undefined', 要不然就維持原本的字串
const parseNA = string => (string === 'NA' ? undefined : string);

// // 日期處理
// d3.timeParse回傳的是一個function，所以可以直接在後面加上(string)
// 表示把string灌入d3.timeParse回傳的function內
// 此parseDate function專門處理('%Y-%m-%d')這種時間格式的字串
const parseDate = string => d3.timeParse('%Y-%m-%d')(string);

// // 數字處理
// 將數字的string前面加上'+'，就能把其轉換成數字
// 利用下面這個function(叫做type)，讓Load Data時能直接使用
// 可以透過不將項目放進去，達成column selection
function type(d){
    const date = parseDate(d.release_date);
    return{
        budget: +d.budget,
        genre: parseNA(d.genre),
        genres: JSON.parse(d.genres).map(d=>d.name),    // 用JSON.parse把多筆資料整理成array
        homepage: parseNA(d.homepage),
        id: +d.id,
        imdb_id: parseNA(d.imdb_id),
        original_language: parseNA(d.original_language),
        overview: parseNA(d.overview),
        popularity: +d.popularity,
        poster_path: parseNA(d.poster_path),
        production_countries: JSON.parse(d.production_countries),
        release_date: date,
        release_year: date.getFullYear(),       // 將date的年分取出
        revenue: +d.revenue,
        runtime: +d.runtime,
        tagline: parseNA(d.tagline),
        title: parseNA(d.title),
        vote_average: +d.vote_average,
        vote_count: +d.vote_count,
    }
}

// // Data selection
// 對每一筆資料檢查，將符合條件的資料回傳
// 條件由程式設計者規劃
function filterData(data){
    return data.filter(
        d => {
            return(
                d.release_year > 1999 && d.release_year < 2010 &&
                d.revenue > 0 &&
                d.budget > 0 &&
                d.genre &&
                d.title
            );
        }
    );
}

// // 刻度顯示格式轉換
function formatTicks(d){
    // return d3.format('~s')(d)
    return d3.format('.2s')(d)
             .replace('M', 'mil')
             .replace('G', 'bil')
             .replace('T', 'tri')
}

// 這次不用聚合
// // // Data Integration資料聚合
// function prepareBarChartData(data){
//     console.log(data);
//     const dataMap = d3.rollup(                  // rollup類似groupby，依特定的欄位將資料捲在一起
//         data,
//         v => d3.sum(v, leaf => leaf.revenue),   // 將revenue加總
//         d => d.genre    // 聚合條件: 依電影分類做groupby
//     );
//     // 將rollup的結果新增為一個dataArray，並設定內部的分類
//     const dataArray = Array.from(dataMap, d => ({genre:d[0], revenue:d[1]}));
//     return dataArray;
// }

// screen draw
// 要依照資料的樣子，去決定畫面寬度與高度
// 因為按按鈕之後會有更動，所以要設定一些「彈性」
function setupCanvas(barChartData, movieClean){
    // 一開始預設指標是revenue
    // 為了相容三種狀況而定了區域變數metric
    let metric = 'revenue';

    function click(){
        // 此處的name是html裡面有設定的data-name
        // 只要有按按鈕，metric就會改變
        metric = this.dataset.name;
        const thisData = chooseData(metric, movieClean);
        // 讓畫面刷新
        update(thisData);
    }

    // 一旦呼叫，就觸發上面的click的function
    d3.selectAll('button').on('click',click);

    // // 切換至其他項目，有些Bar不會顯示詳細資訊，所以需要新增監聽
    // 把bar換成新的樣貌，以及更新標題
    function update(data){
        console.log(data);

        // // 更新Scale，確認新的scale範圍
        xMax = d3.max(data, d=>d[metric]);
        xScale_v3 = d3.scaleLinear([0, xMax],[0,barchart_width]);

        yScale = d3.scaleBand().domain(data.map(d=>d.title))
                               .rangeRound([0, barchart_height])
                               .paddingInner(0.25);

        // 動畫轉換的設定
        const defaultDelay = 1000
        const transitionDelay = d3.transition().duration(defaultDelay);

        // 更新x與y軸，call
        xAxisDraw.transition(transitionDelay).call(xAxis.scale(xScale_v3));
        yAxisDraw.transition(transitionDelay).call(yAxis.scale(yScale));

        // 更新title
        // ` `表示是要更換變動的文字(?
        // $ 表示是要把???
        // 判斷metric === 表示要數值跟字都相同的狀態不然就做後面' '的事情
        // 三元運算子中是運用'?'來連接
        header.select('tspan').text(`Top 15 ${metric} movies ${metric === 'popularity' ? '':'in $US'}`);
        
        // 更新Bar
        bars.selectAll('.bar').data(data, d=>d.title).join(
            enter => {
                enter.append('rect').attr('class','bar')
                     .attr('x',0).attr('y',d=>yScale(d.title))
                     .attr('height', yScale.bandwidth())
                     .style('fill', 'lightcyan')
                     .transition(transitionDelay)
                     .delay((d, i) => i*20)
                     .attr('width',d => xScale_v3(d[metric]))
                     .style('fill', 'dodgerblue')
            },
            update => {
                update.transition(transitionDelay)
                      .delay((d, i) => i*20)
                      .attr('y', d => yScale(d.title))
                      .attr('width', d => xScale_v3(d[metric]))
            },
            exit => {
                exit.transition().duration(defaultDelay/2)      // 離開速度加快
                    .style('fill-opacity', 0)                   // 變成透明
                    .remove()
            }
        );

        // interactive 新增監聽，重新呼叫update
        d3.selectAll('.bar')
          .on('mouseover', mouseover)
          .on('mousemove', mousemove)
          .on('mouseout', mouseout);
    }
        
    // 因為有些電影名稱比較長，所以加寬svg
    const svg_width = 700;
    const svg_height = 500;

    // // 平移
    const barchart_margin = {top:80, right:40, bottom:40, left:250};
    // 計算實際圖表能用的寬跟高
    const barchart_width = svg_width - (barchart_margin.left + barchart_margin.right);
    const barchart_height = svg_height - (barchart_margin.top + barchart_margin.bottom);

    // 將上面的寬跟高，對應到svg上的相對位置
    // 做一個this_svg放在div裡面
    // '.bar-chart-container'中的.，表示是對應到class
    const this_svg = d3.select('.bar-chart-container').append('svg')
                    .attr('width', svg_width).attr('height', svg_height)
                    .append('g')
                    .attr('transform', `translate(${barchart_margin.left},${barchart_margin.top})`);
                    // 'transform'注意不要拼錯(先前拼成'tranform')
    
    // // scale
    // 版本1: d3.extent find the max & min in revenue
    const xExtent = d3.extent(barChartData, d=>d.revenue);
    // debugger;
    const xScale_v1 = d3.scaleLinear().domain(xExtent).range([0, barchart_width]);
    // 版本2: 0 ~ max
    let xMax = d3.max(barChartData, d => d.revenue);
    let xScale_v2 = d3.scaleLinear().domain([0, xMax]).range([0, barchart_width]);
    // 版本3: Short writing for v2
    let xScale_v3 = d3.scaleLinear([0, xMax],[0, barchart_width]);

    // // 垂直空間的分配 - 平均分布給各種類
    // const yScale = d3.scaleBand().domain(barChartData.map(d => d.genre))
    //                              .rangeRound([0, chart_height])
    //                              .paddingInner(0.15);    // 調節每個bar之間的間隔
    
    // 垂直空間的分配 - 平均分布給Top 15
    // 但yScale沒什麼變，因為都是15行bar
    let yScale = d3.scaleBand().domain(barChartData.map(d=>d.title))
                   .rangeRound([0, barchart_height])
                   .paddingInner(0.25);


    // // Draw bars: 在svg中
    // 設定資料來源
    // 設定每一條Bar: 座標x, 座標y, 寬度, 高度, 樣式
    // const bars = this_svg.selectAll('.bar')
    //                      .data(barChartData)
    //                      .enter()
    //                      .append('rect')
    //                      .attr('class','bar')
    //                      .attr('x',0)
    //                      .attr('y',d=>yScale(d.genre))
    //                      .attr('width',d=>xScale_v3(d.revenue))
    //                      .attr('height',yScale.bandwidth())
    //                      .style('fill','DarkGreen')     // 改變bar的顏色
    const bars = this_svg.append('g').attr('class', 'bars');
    
    // 加上標題
    // 本來的'const'表示是更動不了的變數
    // 要改成'let'才能變成可任意更動
    let header = this_svg.append('g').attr('class','bar-header')
                    .attr('transform',`translate(0,${-barchart_margin.top/2})`)
                    .append('text');    // 將文字放上去
    // header.append('tspan').text('Total revenue by genre in $US');   // 將文字放上去
    header.append('tspan').text('Top 15 XXX movies');
    header.append('tspan').text('Years:2000-2009')
            .attr('x',0).attr('y',20)
            .style('font-size','0.8em').style('fill','#555');

    // // 設定刻度
    // tickSizeInner: 刻度線的長度
    // tickSizeOuter: 最兩端是否要畫刻度線
    let xAxis = d3.axisTop(xScale_v3)
                  .ticks(5)
                  .tickFormat(formatTicks)
                  .tickSizeInner(-barchart_height)
                  .tickSizeOuter(0);
    
    // 先不進行call
    // const xAxisDraw = this_svg.append('g')
    //                           .attr('class','x axis')
    //                           .call(xAxis);
    let xAxisDraw = this_svg.append('g').attr('class', 'x axis');

    // tickSize : set tickSizeInner & Outer
    let yAxis = d3.axisLeft(yScale).tickSize(0);
    // let yAxisDraw = this_svg.append('g')
    //                         .attr('class','y axis')
    //                         .call(yAxis);
    let yAxisDraw = this_svg.append('g').attr('class','y axis');

    yAxisDraw.selectAll('text').attr('dx','-0.6em');
    update(barChartData);

    // interactive 互動處理
    const tip = d3.select('.tooltip');

    // 碰到bar的時候會觸發這個function
    // e.clientX與e.clientY為滑鼠位置
    function mouseover(e){
        // get data
        const thisBarData = d3.select(this).data()[0];
        // debugger;
        const bodyData = [
            ['Budget', formatTicks(thisBarData.budget)],
            ['Revenue', formatTicks(thisBarData.revenue)],
            ['Profit', formatTicks(thisBarData.revenue - thisBarData.budget)],
            ['TMDB Popularity', Math.round(thisBarData.popularity)],
            ['IMDB Rating', thisBarData.vote_average],
            ['Genres', thisBarData.genres.join(', ')]   // 變成用字串顯示
        ];

        tip.style('left', (e.clientX + 15) + 'px')
           .style('top', e.clientY + 'px')
           .transition()        // 切換各個Bar時加上轉場動畫會較溫和
           .style('opacity', 0.98);
        
        tip.select('h3').html(`${thisBarData.title}, ${thisBarData.release_year}`);
        tip.select('h4').html(`${thisBarData.tagline}, ${thisBarData.runtime} min.`);
        
        d3.select('.tip-body').selectAll('p').data(bodyData)
          .join('p').attr('class', 'tip-info')
          .html(d => `${d[0]} : ${d[1]}`);
    }
    // 讓滑鼠在移動時也能觸發，會使得觸發的東西較平滑
    function mousemove(e){
        tip.style('left', (e.clientX + 15) + 'px')
           .style('top', e.clientY + 'px');
           
    }
    // 滑鼠移開的時候轉為透明的
    function mouseout(e){
        tip.transition()        // 切換各個Bar時加上轉場動畫會較溫和
           .style('opacity', 0)
    }

    // interactive 新增監聽
    d3.selectAll('.bar')
      .on('mouseover', mouseover)
      .on('mousemove', mousemove)
      .on('mouseout', mouseout);

}

// Main
function ready(movies){
    const movieClean = filterData(movies);
    //Get Top 15 revenue movies
    const revenueData = chooseData('revenue',movieClean);
    console.log(revenueData);
    setupCanvas(revenueData, movieClean);

    // const barChartData = prepareBarChartData(moviesClean).sort(
    //     (a, b) => {
    //         return d3.descending(a.revenue, b.revenue);
    //     }   // 每兩筆資料去呼叫d3.descending()
    // );
    // console.log(barChartData);
    // setupCanvas(barChartData);
}

// Load Data
d3.csv('data/movies.csv', type).then(
    res => {
        ready(res);
        // console.log(res);
        // debugger;    // 要觀察區域變數時，可用debugger進行中斷
    }
);

// 
function chooseData(metric, movieClean){
    const thisData = movieClean.sort((a,b)=>b[metric]-a[metric]).filter((d,i)=>i<15);
    return thisData;
}