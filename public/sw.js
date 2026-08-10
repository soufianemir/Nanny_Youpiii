self.addEventListener("push",event=>{
  let data={title:"Nanny Youpiii",body:"Nouvelle information",url:"/app",tag:"nanny-youpiii"};
  try{if(event.data)data={...data,...event.data.json()};}catch{}
  event.waitUntil(self.registration.showNotification(data.title,{body:data.body,tag:data.tag,icon:"/icon.svg",badge:"/icon.svg",data:{url:data.url}}));
});
self.addEventListener("notificationclick",event=>{
  event.notification.close();
  const url=event.notification.data?.url||"/app";
  event.waitUntil(clients.matchAll({type:"window",includeUncontrolled:true}).then(list=>{
    const existing=list.find(client=>"focus" in client);
    if(existing){existing.navigate(url);return existing.focus();}
    return clients.openWindow(url);
  }));
});
