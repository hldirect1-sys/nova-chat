window.NovaTravelUI=function(esc,anchor,normalizeSearch){
  function safeTravelUrl(value, allowHttp) {
    try { var u = new URL(String(value || '')); return (u.protocol === 'https:' || allowHttp && u.protocol === 'http:') && !u.username && !u.password && !/[?&](api_key|access_token|secret)=/i.test(u.search) ? u.href : ''; } catch (e) { return ''; }
  }
  function normalizeHotels(hotels) {
    return (Array.isArray(hotels) ? hotels : []).slice(0,5).map(function(h) {
      var photos = (Array.isArray(h.photos) ? h.photos : []).map(function(x) { return {url:safeTravelUrl(x.url),full:safeTravelUrl(x.full || x.url),source:String(x.source || '').slice(0,100)}; }).filter(function(x) { return x.url; }).slice(0,6);
      var reviews = (Array.isArray(h.guestReviews) ? h.guestReviews : []).slice(0,3).map(function(r) { return {text:String(r.text || '').slice(0,450),name:String(r.name || 'Guest').slice(0,80),source:String(r.source || '').slice(0,40),date:String(r.date || '').slice(0,40),rating:String(r.rating || '').slice(0,8),link:safeTravelUrl(r.link)}; });
      return {name:String(h.name || 'Hotel').slice(0,200),link:safeTravelUrl(h.link,true),map:safeTravelUrl(h.map),rating:Number.isFinite(Number(h.rating))&&h.rating!==''?String(Math.round(Number(h.rating)*10)/10):'',count:String(h.count || '').slice(0,20),hotelClass:String(h.hotelClass || '').slice(0,60),nightly:String(h.nightly || 'Not supplied').slice(0,60),total:String(h.total || 'Not supplied').slice(0,60),dates:String(h.dates || '').slice(0,100),currency:String(h.currency || '').slice(0,8),fetched:String(h.fetched || '').slice(0,50),photos:photos,guestReviews:reviews,amenities:(Array.isArray(h.amenities)?h.amenities:[]).slice(0,6).map(function(x){return String(x).slice(0,80);})};
    });
  }
  function travelSearch(evidence) {
    var receipts = Array.isArray(evidence) ? evidence : [], hotels = [], sources = [];
    receipts.filter(function(r){return r.engine==='google';}).forEach(function(r){sources=sources.concat(r.result && Array.isArray(r.result.organic_results)?r.result.organic_results:[]);});
    receipts.filter(function(r) { return r.engine === 'google_hotels'; }).forEach(function(r) {
      var params = r.result && r.result.search_parameters || {};
      (r.result && Array.isArray(r.result.properties) ? r.result.properties : []).slice(0,5).forEach(function(p) {
        var photos = (Array.isArray(p.images)?p.images:[]).map(function(x) { return {url:x.thumbnail || x.original_image,full:x.original_image || x.thumbnail,source:'Google Hotels'}; });
        var reviews = [];
        receipts.forEach(function(extra) {
          var token = extra.property_token || extra.result && extra.result.search_parameters && extra.result.search_parameters.property_token;
          if (!p.property_token || token !== p.property_token) return;
          var raw=extra.result || {};
          if(extra.engine==='google_hotels_photos') {
            var all = (Array.isArray(raw.photos)?raw.photos:[]).concat.apply(Array.isArray(raw.photos)?raw.photos:[],(Array.isArray(raw.sections)?raw.sections:[]).map(function(section){return Array.isArray(section.photos)?section.photos:[];}));
            photos = all.map(function(x){return {url:x.thumbnail_url || x.photo_url,full:x.photo_url || x.thumbnail_url,source:x.source || 'Google Hotels'};}).concat(photos);
          }
          if(extra.engine==='google_hotels_reviews') reviews=(Array.isArray(raw.reviews)?raw.reviews:[]).map(function(x){return {text:x.snippet,name:x.user && x.user.name,source:x.source,date:x.date,rating:x.rating,link:x.link || x.user && x.user.link};});
        });
        var gps=p.gps_coordinates || {}, map='';
        if(Number.isFinite(gps.latitude)&&Number.isFinite(gps.longitude)) map='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(gps.latitude+','+gps.longitude);
        else map='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(p.name+' '+(params.q || ''));
        hotels.push({name:p.name,link:p.link,map:map,rating:p.overall_rating,count:p.reviews,hotelClass:p.hotel_class,nightly:p.rate_per_night && p.rate_per_night.lowest,total:p.total_rate && p.total_rate.lowest,dates:(params.check_in_date || '')+' → '+(params.check_out_date || ''),currency:params.currency,fetched:r.fetched_at,photos:photos,guestReviews:reviews,amenities:p.amenities});
      });
    });
    return hotels.length || sources.length ? normalizeSearch({results:sources,hotels:normalizeHotels(hotels)},{ran:true,ok:true}) : null;
  }
  function renderHotels(hotels) {
    if (!hotels || !hotels.length) return '';
    return '<section class="hotel-shortlist" aria-label="Hotel shortlist"><h3>Your hotel shortlist</h3><p class="hotel-caption">Photos, guest feedback and stay details from Google Hotels</p>'+hotels.map(function(h) {
      var gallery=h.photos.length ? '<div class="hotel-gallery" aria-label="Photos of '+esc(h.name)+'">'+h.photos.map(function(x,i){return '<a href="'+esc(x.full || x.url)+'" target="_blank" rel="noopener noreferrer"><img src="'+esc(x.url)+'" alt="'+esc(h.name)+' — photo '+(i+1)+'" loading="lazy" referrerpolicy="no-referrer"></a>';}).join('')+'</div>' : '';
      var reviews=h.guestReviews.filter(function(r){return r.text;});
      return '<article class="hotel-card">'+gallery+'<div class="hotel-details"><h4>'+esc(h.name)+'</h4><p class="hotel-rating">'+(h.rating?'<strong>'+esc(h.rating)+'/5</strong>':'')+esc(h.count?h.count+' reviews · ':'')+esc(h.hotelClass)+'</p><p class="hotel-caption">'+esc(h.dates)+' · '+esc(h.currency)+'</p><div class="hotel-prices"><div><span>Per night</span><b>'+esc(h.nightly)+'</b></div><div><span>Entire stay</span><b>'+esc(h.total)+'</b></div></div><div class="hotel-amenities">'+h.amenities.map(function(a){return '<span>'+esc(a)+'</span>';}).join('')+'</div><div class="hotel-actions">'+(h.link?anchor(h.link,'View hotel'):'')+(h.map?anchor(h.map,'Open map'):'')+'</div>'+(reviews.length?'<details class="hotel-reviews"><summary>Guest review excerpts ('+reviews.length+')</summary>'+reviews.map(function(r){return '<div class="hotel-review"><b>'+esc(r.name)+(r.rating?' · '+esc(r.rating)+'/5':'')+'</b><p>'+esc(r.text)+'</p><small>'+esc(r.source+' · '+r.date)+'</small>'+(r.link?' '+anchor(r.link,'Source'):'')+'</div>';}).join('')+'</details>':'')+'<p class="hotel-footnote">Retrieved '+esc(h.fetched)+'. Taxes, fees, room type and availability require provider confirmation. No booking made.</p></div></article>';
    }).join('')+'</section>';
  }


return {normalizeHotels:normalizeHotels,travelSearch:travelSearch,renderHotels:renderHotels};
};
