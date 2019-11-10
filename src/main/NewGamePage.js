      import React, { Component } from "react";
      import { Link } from "react-router-dom";
      import {
        Grid,
        FormControl,
        Input,
        InputLabel,
        InputAdornment,
        Icon,
        IconButton,
        FormHelperText,
        CircularProgress,
        Tooltip
      } from "@material-ui/core";
      import Send from "@material-ui/icons/Send";
      import KeyboardArrowRight from "@material-ui/icons/KeyboardArrowRight";
      import KeyboardArrowLeft from "@material-ui/icons/KeyboardArrowLeft";
      import Help from "@material-ui/icons/HelpOutline";
      import AudioAnalyser from "./AudioAnalyser";
      import firebase from "../base";
      import staticFirebase from "firebase";
      import GameRuleDialog from "./GameRuleDialog";
    
      const INITIAL_STATE = {
        currentTags:{},
        displayTag:{},
        loading: true,
      };

///
      export default class GamePage extends Component {
        constructor(props) {
          super(props);
          this.state = {...INITIAL_STATE};

          this.textInput = React.createRef();
        }  
        componentDidMount = async() =>{

          this.user = firebase.auth().currentUser;
          this.db = firebase.firestore();
          this.currentId = firebase.auth().currentUser.uid;
          this.userRef = this.db.collection('users').doc(this.currentId);
          this.firstUserId = '';

          this.loadUrl();
         //this.loadFiles();
        }

        componentDidUpdate(prevProps, prevState) {
          this.textInput.current.focus(); 
        }

        handleKeyPress = event => {
          if (event.key === 'Enter') {
            document.getElementById("submitButton").click();
          }
        }
        //this function loads JSON file under 'public' directory (which contains each clips Url) into firebase collections
        loadFiles = async () => {
          var data;
          var xmlhttp = new XMLHttpRequest();
          var myJSON;
          var items;
          var dataArray = [];
          var audiosDataRef = await this.db.collection('audios');
          var randomRef = await this.db.collection('Randomize');
          xmlhttp.onreadystatechange = async function(){
            if(xmlhttp.status === 200 && xmlhttp.readyState === 4){
              data = xmlhttp.responseText;
              console.log(typeof(data));
              myJSON = JSON.parse(data);
              items = myJSON.items;
              for(var i = 0; i < items.length; i++){
                audiosDataRef.doc(i+'').set({
                  Title: items[i].name,
                  Url: 'https://firebasestorage.googleapis.com/v0/b/majorminer-dd13a.appspot.com/o/'+items[i].name+'?alt=media&token='+items[i].metadata.firebaseStorageDownloadTokens
                });
                randomRef.doc(i+'').set({
                  count: 0
                });
                console.log(i);
              }
            }
          };
          xmlhttp.open("GET","/text/data.json",true);
          xmlhttp.send();
          console.log(dataArray.length);
        }
        //random loading Url
        loadUrl = async () => {
          console.log("currentUser: " + firebase.auth().currentUser.uid);
          this.existingTags = {};
          this.clipId = await this.randomizeId();
          console.log(this.clipId);
         
          this.audioRef = await this.db.collection('audios').doc(this.clipId);
          try {
            // load url
            const doc = await this.audioRef.get();
            this.url = doc.data().Url;
            console.log(this.clipId);
            console.log(this.url);
          }catch(err){
            console.log(err);
          } 
          await this.setState({ loading: false });
        }
        //getting existing tags from database
        loadExistingTag = tags => {
          // load existing tags       
          try{
            if (tags) {
            tags.forEach(tag => (this.existingTags[tag.id] = {
              count: tag.data().count,
            }));
           }
          }catch(err){
            console.log("loadExistingTagError: " + err);
          }
          return this.existingTags;
        } 
        //compare timeStamps
        compareTime = async timeStamp => {
          var month = new Array();
          month[0] = "January";
          month[1] = "February";
          month[2] = "March";
          month[3] = "April";
          month[4] = "May";
          month[5] = "June";
          month[6] = "July";
          month[7] = "August";
          month[8] = "September";
          month[9] = "October";
          month[10] = "November";
          month[11] = "December";
         
          const thatTime = timeStamp.toMillis();
          console.log("that time: ", thatTime);
          
          var d = new Date();
          var day = d.getDay()+'';
          var todayDate = d.getDate()+'';
          var thisMonth = month[d.getMonth()]+' ';
          var year = d.getFullYear()+'';
          console.log("day", day);
          console.log("date ", todayDate);
          console.log("month", thisMonth);
          console.log("year", year);
          const parseStringToday = thisMonth+todayDate+', '+year;
          console.log(parseStringToday);
          var today = Date.parse(parseStringToday);
          console.log("today: ", today);

          const now = Date.now();
          console.log("now: ", now);
          
          var compare = now - thatTime;
          if(compare <= 3600000){
            console.log("within an hour", compare);
            return 1;
          }
          else if(thatTime <= today+3600000 * 24){
            console.log("it's today");
            return 2;
          }
          else if(thatTime <= today+3600000 * 24 * 7){
            console.log("this week");
            return 3;
          }
          else{
            console.log("long time ago");
            return 4;
          }
        }
        oneDayRange = () => {
          var month = new Array();
          month[0] = "January";
          month[1] = "February";
          month[2] = "March";
          month[3] = "April";
          month[4] = "May";
          month[5] = "June";
          month[6] = "July";
          month[7] = "August";
          month[8] = "September";
          month[9] = "October";
          month[10] = "November";
          month[11] = "December";
         
          var d = new Date();
          var todayDate = d.getDate()+'';
          var thisMonth = month[d.getMonth()]+' ';
          var year = d.getFullYear()+'';
          const parseStringToday = thisMonth+todayDate+', '+year;
          var today = Date.parse(parseStringToday);//millionSeconds for 00:00:00 today
          console.log("today: ", today);

          return today+ 3600000 * 24;
        }
        randomizeId = async() => {
          var clip;
          var userHasSeen = new Set();
          var rand = Math.random();
          
          var currentUserSeenSnapshot = await this.db.collection('Randomize').where('userId', 'array-contains', this.currentId).get();//current user has seen
          for(const userSeen of currentUserSeenSnapshot.docs){
            userHasSeen.add(userSeen.id);
          }
          var pnew = this.findMin(0.0066*currentUserSeenSnapshot.size,0.33);
          console.log("rand", rand);
          console.log("pnew", pnew);
          if(rand < pnew){
            clip = this.pick_pioneer();
            console.log("rand < pnew");
          }else{
            clip = this.pick_settler(userHasSeen);
            console.log("rand > pnew");
          }
          return clip;
        }
        pick_pioneer = async() => {
          var noSeenSnapshot = await this.db.collection('Randomize').where('count', '==', 0).get();
            if(noSeenSnapshot.size !== 0) {// pick the one has not been seen 
              console.log("noSeenSnapshot[0]");
              return noSeenSnapshot.docs[0].id+'';
            }
          console.log("Math.random");
          return Math.floor((Math.random()*5))+'';//every clip has been seen
        }
        pick_settler = async (userHasSeen) => {
          var now = Date.now(); //pick the one has been seen && has not been seen in the last hour && current user has no seen
          var oneHour = now - 3600000;
          var oneHourNoSeenSnapshot = await this.db.collection('Randomize').where('millis', '<', oneHour).orderBy('millis').get();//no seen past hour 
          if(oneHourNoSeenSnapshot.size === 0){//every clip has been seen in past hour, unlikely occur but still might or there are some clips have no been seen at all
            console.log("oneHourNoSeenSnapshot == 0");
            return this.pick_pioneer();
          }else{//some clips have no been seen in past hour
            ///////debug console
            console.log("oneHourNoSeenSnapshot:  ",oneHourNoSeenSnapshot);
            for(const clip of oneHourNoSeenSnapshot.docs){
              console.log("oneHourNoSeenSnapshot", clip.id);
            }
            ///////////

            for(const clip of oneHourNoSeenSnapshot.docs){
              if(!userHasSeen.has(clip.id)){
                console.log("!userHasSeen.has(clip.id)");
                return clip.id+'';
              }
            } 
            //this user has seen all of the clips in the oneHourNoSeenSnapshot
            return this.pick_pioneer();
          }
        }
        findMin = (num1,num2) => {
           if(num1 > num2)
              return num2;
            return num1;
        }

        //getting next clips
        getNextClip = async () => {
          await this.setState({currentTags:{}, loading: true, displayTag:{}});
          this.loadUrl();
        }  
        //submit tags
        handleSubmit = async () => {
          const newTags = document.getElementById("tags").value.toLowerCase().replace(/\s/g,'').split(",");
          

          //generate temporatyTags set from new Tags
          var tempCurrentTags = {};
          this.audioTagRef = await this.audioRef.collection('tags');
          this.audioUsersRef = await this.audioRef.collection('users');
          
          const tags = await this.audioTagRef.get();
          //generate exitingTags from DB
          this.existingTags = await this.loadExistingTag(tags);

         
          console.log("existingTags");
          console.log(this.existingTags);
        
          newTags.forEach(tag => {
            if(Object.keys(this.existingTags).includes(tag)){
              tempCurrentTags[tag] = {
                count: this.existingTags[tag].count,
                score: 0,
              }
            }else{
             tempCurrentTags[tag] = {
                count: 0,
                score: 0,
              }
            }
          });
          

           console.log("displayTag");
          console.log(this.state.displayTag);
         
          // console.log("newTags: " + newTags);
           document.getElementById("tags").value = "";
        
          this.loadTagsToDb(tempCurrentTags).then(tempCurrentTags => {
            tempCurrentTags = tempCurrentTags;
          
            this.setState({currentTags: tempCurrentTags});

            console.log("currentTags:");
            
            console.log(this.state.currentTags);

            console.log("tempCurrentTags");
            console.log(tempCurrentTags);


            for( const tag of Object.keys(tempCurrentTags)){
               this.setState(prevState => ({ displayTag: {...prevState.displayTag, [tag]: {score: tempCurrentTags[tag].score, count:  tempCurrentTags[tag].count }}}));
            }
          }) 
        

        }
        //get first user Id 
        getUserId = async tag => {
          var firstUser = await this.db.collection('audios').doc(this.clipId).collection('users').where('tags', 'array-contains', tag).get();
          console.log("firstUser:  ", firstUser.docs[0].id);
          return firstUser.docs[0].id;
        }
        //laoding tags into DB
        loadTagsToDb = async (currentTags) => {
          try{
            for(const tag of Object.keys(currentTags)){ 
              await this.addUser(tag);
              this.History(this.userRef,this.currentId,0);
              if (currentTags[tag].count === 1) {
                //if this user is the second person describe the tag, add 2 points to the first user
                var firstUserId = await this.getUserId(tag);
                var firstUserRef = await this.db.collection('users').doc(firstUserId);
                console.log("!!firstUserId: " + firstUserId);
                if(firstUserId !== this.currentId){//if the first user is not current user 
                     this.History(firstUserRef,firstUserId,2);
                    //get 1 point if current user is the second person describe this tag
                     currentTags[tag].score = 1;
                     this.History(this.userRef,this.currentId,1);
                }          
              } else if(currentTags[tag].count === 0){ //if the user is the first person, 0 score for now, count = 1
                  this.History(this.userRef,this.currentId,0);
              }else{//if the user is the third or more than third person, no points
                this.History(this.userRef,this.currentId,0);
              }
              await this.audioUsersRef.doc(this.currentId).set({
                tags: staticFirebase.firestore.FieldValue.arrayUnion(tag)//add the user to "users" collection,save the tags as array
              },{ merge: true });
             }
            }catch(err){
            console.log("can't upload tags into DB!!:  "+ err);
          }
          return currentTags;
        }
        addUser = tag => {
          try{
            this.audioTagRef.doc(tag).set({
              count: staticFirebase.firestore.FieldValue.increment(1),
              userId: staticFirebase.firestore.FieldValue.arrayUnion(this.currentId)
            },{merge: true});
          }catch(err){
            console.log("can't add user: " + err);
          }
        }
        refreshTotalScore = (userRef,score) => {
          userRef.update({
            score: staticFirebase.firestore.FieldValue.increment(score)
          })
        }
        isFrist = tag => {
          this.audioTagRef.doc(tag).set({
            count: 1,
            userId: staticFirebase.firestore.FieldValue.arrayUnion(this.currentId)
          })
        }
        History = async (userRef, userId, score) => {
          try{
          var userClipHistoryRef = await userRef.collection('clipHistory');
           userClipHistoryRef.doc(this.clipId).get()
              .then(doc => {
                 if (doc.exists) {
                   this.updateHistory(userClipHistoryRef,score);
                 } else {
                   this.createHistory(userClipHistoryRef,score);
                 }
                  this.refreshTotalScore(userRef,score);
              });
          }catch(err){
            console.log("Can't create clipHistory!! " + err);
          }
          if(score !== 0){//if this user gained scores, save it to the scoreRecord collection
            var oneDayRangeMillis = this.oneDayRange();
            try{
              var scoreRecordRef = this.db.collection('scoreRecord').doc(userId);
              var scoreRef = await this.db.collection('scoreRecord').doc(userId).collection('score');
              scoreRef.doc(oneDayRangeMillis+'').get()
                .then(doc => {
                  if(doc.exists){
                    scoreRef.doc(oneDayRangeMillis+'').update({
                      score: staticFirebase.firestore.FieldValue.increment(score)
                   });
                  }else{
                    scoreRef.doc(oneDayRangeMillis+'').set({
                      score: score,
                      millis: oneDayRangeMillis,
                      createdAt: staticFirebase.firestore.FieldValue.serverTimestamp()
                    })
                  }
                });
              var username = await this.db.collection('users').doc(userId).get();
              var user = username.data().username;
              scoreRecordRef.set({
                updated: staticFirebase.firestore.FieldValue.serverTimestamp(),
                millis: oneDayRangeMillis,
                username: user
              });
            }catch(e){
              console.log("Can't add score scoreRecord!");
            }
          }
        }
        updateHistory = (userClipHistoryRef,score) => {
          try{
            userClipHistoryRef.doc(this.clipId).update({
              score: staticFirebase.firestore.FieldValue.increment(score),
              lastUpdatedAt: staticFirebase.firestore.FieldValue.serverTimestamp()
            });
          }catch(err){
            console.log("Can't update clipHistory: " + err);
          }
        }
        createHistory = (userClipHistoryRef,score) => {
          try{
            userClipHistoryRef.doc(this.clipId).set({
              score: staticFirebase.firestore.FieldValue.increment(score),
              createdAt: staticFirebase.firestore.FieldValue.serverTimestamp(),
              lastUpdatedAt: staticFirebase.firestore.FieldValue.serverTimestamp()
            });
          }catch(err){
            console.log("Can't create clipHistory: " + err);
          }
        }
        render() {
         const url = this.url;
         const clipId = this.clipId;
         const {currentTags,displayTag} = this.state;
          return (
            <Grid container className="game-container" direction="column" alignItems="center" spacing={16}>
              <Grid item container alignItems="center">
                <Grid item sm={1} md={1} lg={1}><GameRuleDialog /></Grid>
                <Grid item sm={10} md={10} lg={10}>
                  <h1>Describe this clip</h1>
                </Grid>
                <Grid item sm={1} md={1} lg={1}></Grid>
              </Grid>
              <Grid item container alignItems="center">
                <Grid item sm={3} md={3} lg={3}>
                  <Link to="/main" style={{ "textDecoration": "none" }}>
                    <IconButton id="gameSummary" style={{ "borderRadius": "0" }}>
                      <KeyboardArrowLeft />
                      Summary
                    </IconButton>
                  </Link>
                </Grid>
                {this.state.loading ? (
                  <Grid item sm={6} md={6} lg={6} className="canvas-container">
                    <CircularProgress size={100} thickness={3.6} />
                  </Grid>
                ) : (
                  <AudioAnalyser url={url} clipId={clipId}/>
                )}
                <Grid item sm={3} md={3} lg={3}>
                  <IconButton id="nextClip" style={{ "borderRadius": "0" }} onClick={this.getNextClip}>
                    Next Clip
                    <KeyboardArrowRight />
                  </IconButton>
                </Grid>
              </Grid>
             <Grid item id="listTag" sm={10} md={6} lg={8}>
                {Object.keys(displayTag).map((tag, i) => {
                  if (displayTag[tag].count === 0) {
                    return (<span key={i} className="gray">{tag}&nbsp;</span>)
                  } else if (displayTag[tag].score === 1) {
                    return (<i key={i} className="1-point">{tag}&nbsp;</i>)
                  } else {
                    return (<span key={i} className="pink">{tag}&nbsp;</span>)
                   } 
                })}
              </Grid>
              <Grid item sm={10} md={6} lg={8}>
                <FormControl margin="normal" fullWidth>
                  <InputLabel>Input your tags...</InputLabel>
                  <Input
                    id="tags"
                    type="text"
                    autoFocus={true}
                    inputRef={this.textInput}
                    onKeyPress={this.handleKeyPress}
                    endAdornment={
                      <InputAdornment position="end">
                        <IconButton id="submitButton" onClick={this.handleSubmit}>
                          <Send />
                        </IconButton>
                        <Tooltip
                          title={
                            <p>You can input more than one tag <br />by using commas to separate.</p>
                          }
                          placement="right"
                        >
                          <Icon>
                            <Help />
                          </Icon>
                        </Tooltip>
                      </InputAdornment>
                    }
                  />
                  <FormHelperText>
                    Tag colors: <i>1 point</i>, <span className="gray">no points yet (but could be 2)</span>, <span className="pink">0 points</span>.
                  </FormHelperText>
                </FormControl>
              </Grid>
            </Grid>
          );
        }
      }
     