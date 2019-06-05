class HttpUtil{

  constructor(url,opt={}){

    let token = window.sessionStorage.getItem("token");

    let headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      // 'Content-Type': 'application/x-www-form-urlencoded',
    }
    this.headers = headers

    this.req = {
      method: "GET",
      headers
    };
    //this.host = opt.host || "10.10.11.35:8020"
    this.opt = opt;
    this.data = opt.data
    this.url = url
    this.method = opt.method || this.req.method;

  }

  body = {}

  getBody(){
    let method = this.method
    let body = [];
    if(method.toLocaleUpperCase() === "POST") {
      let params = this.data
      body = JSON.stringify(params)
    }
    return body
  }

  getRequest(){
    if(this.method === "POST"){
      return {
        method:this.method,
        headers:this.headers,
        body:this.getBody()
      }
    }else{
      return {
        method:this.method,
        headers:this.headers
      }
    }

  }

  dataToString(params){
    let res = []
    for (var property in params) {
      if(params[property] !== null && typeof params[property] !== "undefined"){
        var encodedKey = (property);
        var encodedValue = params[property]
        res.push(encodedKey + "=" + encodedValue);
      }
    }
    return res.join("&");
  }

  getUrl(){
    if(this.method.toLocaleUpperCase() === "GET" && this.data){
      const para = this.dataToString(this.data)
      return `${this.url}?${para}`
    }
    return this.url
  }

  packResponse(res) {
    const { status } = res || {};
    let response = {};
    switch (status) {
      case 401:
        break
      case 402:
        alert("登录失效,请重新登录")
        //如果返回值为 401 或 402 代表token失效 重新登录
        // global.store.dispatch(NavigationActions.navigate({ routeName: 'login' }))
        window.location.href = "/login"
        break
      case 403:
        alert("没有权限,请联系管理员")
        break;
      case 404:
        alert("找不到页面")
        break
      default:
        response = res;
        break;
    }
    return response;
  }
}
export default function BDFetch(relativeUrl,opt){
  const util = new HttpUtil(relativeUrl,opt);
  const url = util.getUrl();
  const request = util.getRequest();
  return new Promise((resolve,reject)=>{
    if(true){
      console.log("request",url,request)
    }
    fetch(url,request).then(response =>
      response.json().then(data => {
          return {
            data: data,
            status: response.status
          }
        }
      )).then((res)=>{
      if(true){
        console.log("response",res)
      }
      if(res.status === 200){
        return res.data
      }else{
        return res
      }
    })
      .then(res=>{
        if(res.code && res._code !== 200){
          if( res && typeof res._msg === "string" ){
            alert(res._msg || "")
          }
          resolve(res)
        }else{
          resolve(res)
        }
      })
      .catch( err=>{
        console.log("网络错误",err)
        resolve({result:"亲，小新临时不在线，会尽快回来为您服务的，请您稍后再试",type:1,state:2})
      })
  })
}