import React, {Component} from 'react';
import { Platform, StyleSheet, Text, View, Button, Picker, Alert,
         TouchableOpacity } from 'react-native';
import {Permissions, Location, Font} from 'expo';
import MapView from 'react-native-maps';
import PopupDialog from 'react-native-popup-dialog';
import DateTimePicker from 'react-native-modal-datetime-picker';
import Popup from './Popup.js';
import firebase from 'firebase';
import ActionButton from 'react-native-action-button';
import Modal from 'react-native-modal';
import FontAwesome, { Icons } from 'react-native-fontawesome';
import { Actions } from 'react-native-router-flux';

//import image files for markers
import veg from './images/veg.png';
import food from './images/food.png';
import gluten from './images/gluten.png';
import cookie from './images/cookie.png';
import other from './images/other.png';


export class Map extends Component {
  // Initialize Firebase
  constructor(props) {
    super(props);

    console.ignoredYellowBox = [
        'Setting a timer'
    ]

    this.state = {
      userRegion: {
        latitude: 32.8801,
        longitude: -117.2340,
        latitudeDelta: 0.0422,
        longitudeDelta: 0.0221
      },
      mapRegion: {
        latitude: 32.8801,
        longitude: -117.2340,
        latitudeDelta: 0.0422,
        longitudeDelta: 0.0221
      },
     markers: [],
     filteredMarkers: [],
     renderedMarkers: [],
     showModal: false,
     eventModal: false,
     tag: 'none',
     selectedEvent: 'null'
    }

  }


    //Gets user location and updates mapRegion in state
  _getLocationAsync = async () => {
    //grab user location and store it
    let { status } = await Permissions.askAsync(Permissions.LOCATION);
    let location = await Location.getCurrentPositionAsync({});
    this.setState({
      userRegion: {
        latitude:  Number(JSON.stringify(location.coords.latitude)),
        longitude: Number(JSON.stringify(location.coords.longitude)),
        latitudeDelta: 0.0422,
        longitudeDelta: 0.0221
      }
    });

    //update mapRegion with user location
    this.setState({
      mapRegion: this.state.userRegion
    });
  };

  //toggle Filter Modal
  showFilterModal = () => this.setState({ filterModal: true })

  hideFilterModal = () => this.setState({ filterModal: false })

  //toggle Event Modal
  showEventModal = (marker) => this.setState({ eventModal: true, selectedEvent: marker })

  hideEventModal = () => this.setState({ eventModal: false })

  showAccount() {
    Actions.account();
  }

  //update selected event's score in database
  updateScore () {
    var updates = {};
    updates['/score'] = this.state.selectedEvent.score;
    firebase.database().ref('events').child(this.state.selectedEvent.key).update(updates);
    console.log(this.state.selectedEvent);
    //console.log(this.state.selectedEvent.score);
    //console.log(this.state.renderedMarkers);
  }

  //function when user thumbs up event
  thumbsUpEvent () {
    this.setState(prevState => ({
      selectedEvent: {
        ...prevState.selectedEvent,
        thumbUpUsers: prevState.selectedEvent.thumbUpUsers ? 0 : 1,
        score: prevState.selectedEvent.score + 1,
      }
    }), this.updateScore);
  }

  //function when user thumbs down event
  thumbsDownEvent () {
    this.setState(prevState => ({
      selectedEvent: {
        ...prevState.selectedEvent,
        score: prevState.selectedEvent.score - 1
      }
    }), this.updateScore);
  }

  //calls getLocation method after map is rendered
  async componentDidMount() {
    this._getLocationAsync();
    console.log("Loading Font Awesome...")
    await Font.loadAsync({
      FontAwesome: require('./fonts/font-awesome-4.7.0/fonts/FontAwesome.otf')
    });
    console.log("Font Awesome loaded!")
    this.setState({ fontLoaded: true });
  }


  //updates mapRegion object in state
  _handleMapRegionChange = mapRegion => {
      this.setState({ mapRegion });
  };

  //creates a marker on the map
  _createMarker(lat, long, desc) {
    this._popup.show(lat, long);
  };

  //sets image for MapMarker depending on event's tag
  _setMarkerImg(tag){
    switch(tag) {
      case 'veg':
        return veg;
        break;

      case 'gluten':
        return gluten;
        break;

      case 'food':
        return food;
        break;

      case 'cookie':
        return cookie;
        break;

      case 'other':
        return other;
        break;
        
      default:
        return null;
    }
  }

  //after component is rendered
  componentWillMount() {
    //pull events from database
    let eventsRef = firebase.database().ref('events');
    eventsRef.on('value', function(data) {
      var items = [];
      data.forEach(function(dbevent) {
        var item = dbevent.val()
        // check if now is within event start and end dates
        let now = new Date();
        if (new Date(item.date.start) <= now &&
            now <= new Date(item.date.end)) {
          item['key'] = dbevent.key;
          items.push(item);
        }
      }.bind(this));
      //set markers in state and renderedmarkers if not currently filtered
      this.setState({markers: items});
      if(this.state.tag == 'none'){
        this.setState({renderedMarkers: items});
      }
    }.bind(this));
  }

  //get events that have a certain tag and sets them to renderedMarkers
  getFilteredResults() {
    if(this.state.tag == 'none'){
      this.setState({renderedMarkers: this.state.markers});
    }else{
      var items = [];
      this.state.markers.map(function (marker) {
        if(marker.tag == this.state.tag){
          items.push(marker);
        }
      }, this);
      this.setState({filteredMarkers: items});
      this.setState({renderedMarkers: items});
    }
  }

  report() {
    Alert.alert(
      "Do you want to report this event?", 
      "",
      [
        {text: 'Cancel'},
        {text: 'Yes!', onPress: () => {
          firebase.auth().signOut().then(function() {
            Alert.alert('Your report has been recorded! Thank you!');
          }, function(error) {
            Alert.alert('Ah oh! Error...', error);
          });
        }},
      ],
    );
  }


  render() {    
    return (
      <View
        style={styles.container}
      >
        <MapView
          ref = {(mapView) => { _map = mapView; }}
          style={styles.container}
          onRegionChange={this._handleMapRegionChange}
          region={this.state.mapRegion}
          showUserLocation={true}
          initialRegion = {{
            latitude: 32.8801,
            longitude: -117.2340,
            latitudeDelta: 0.0422,
            longitudeDelta: 0.0221
          }}
          showsUserLocation={true}
          onLongPress={e => this._createMarker(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude, 'marker')
        }
        >
          {this.state.renderedMarkers.map(marker => (
              <MapView.Marker
                ref={marker => (this.marker = marker)}
                key={marker.key}
                image={this._setMarkerImg(marker.tag)}
                coordinate={marker.coordinate}
                onPress={() => {
                 this.showEventModal(marker);
                }} />
          ))}
        </MapView>

        <View style={styles.bottomBar}>

          <TouchableOpacity
              style={styles.filterButton}
              onPress={this.showFilterModal}
          >
            <Text style={{ fontSize: 30, color: '#FFFFFF' }}>
              {this.state.fontLoaded ? (
                <FontAwesome>{Icons.filter}</FontAwesome>
              ) : null}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.centerButton}
              onPress={() =>_map.animateToRegion(this.state.userRegion, 499)}
          >
            <Text style={{ fontSize: 30, color: '#FFFFFF' }}>
              {this.state.fontLoaded ? (
                <FontAwesome>{Icons.compass}</FontAwesome>
              ) : null}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
              style={styles.accountButton}
              onPress={this.showAccount.bind(this)}
          >
            <Text style={{ fontSize: 30, color: '#FFFFFF' }}>
              {this.state.fontLoaded ? (
                <FontAwesome>{Icons.user}</FontAwesome>
              ) : null}
            </Text>
          </TouchableOpacity>

        </View>

        <Modal isVisible={this.state.filterModal}
           onBackdropPress={this.hideFilterModal}
           onModalHide={this.getFilteredResults.bind(this)}>
           <View style={styles.filterModal}>
             <Text stylme={{textAlign:'center'}}>Choose Filter</Text>
             <Picker
               selectedValue={this.state.tag.toString()}
               onValueChange={(itemValue, itemIndex) => this.setState({tag: itemValue})}>
               <Picker.Item label="None" value="none" />
               <Picker.Item label="Food" value="food" />
               <Picker.Item label="Cookie" value="cookie" />   
               <Picker.Item label="Gluten Free" value="gluten" />
               <Picker.Item label="Vegetarian" value="veg" />   
               <Picker.Item label="Other" value="other" />       
             </Picker>
           </View>
        </Modal>

        <Modal isVisible={this.state.eventModal}
        onBackdropPress={this.hideEventModal}>
          <View style={styles.eventModal}>
            <Text style={styles.eventName}>{this.state.selectedEvent.title}</Text>
            <Text style={styles.eventDetails}>Details: {this.state.selectedEvent.description}</Text>
            <Text style={styles.eventDetails}>Tag: {this.state.selectedEvent.tag}</Text>
            <Text style={styles.eventDetails}>Score: {this.state.selectedEvent.score}</Text>
            <View style={styles.buttons}>

              <View style={{width: 80 }}>
                <TouchableOpacity
                    style={styles.thumbsUpButton}
                    onPress={() => this.thumbsUpEvent()}
                >
                  <Text style={{ fontSize: 35, color: '#00FF00' }}>
                    {this.state.fontLoaded ? (
                      <FontAwesome>{Icons.thumbsUp}</FontAwesome>
                    ) : null}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={{width: 40}}>
                <TouchableOpacity
                    style={styles.thumbsDownButton}
                    onPress={() => this.thumbsDownEvent()}
                >
                  <Text style={{ fontSize: 35, color: '#FF0000' }}>
                    {this.state.fontLoaded ? (
                      <FontAwesome>{Icons.thumbsDown}</FontAwesome>
                    ) : null}
                  </Text>
                </TouchableOpacity>
              </View>

            </View>

            <View style={{top: '3%', right: '4%', position: 'absolute'}}>
              <TouchableOpacity
                  style={styles.reportButton}
                  onPress={() => this.report()}
              >
                <Text style={{ fontSize: 35, color: '#404040' }}>
                  {this.state.fontLoaded ? (
                    <FontAwesome>{Icons.exclamation}</FontAwesome>
                  ) : null}
                </Text>
              </TouchableOpacity>
            </View>

          </View>
        </Modal>

      <Popup ref={(popup) => {this._popup = popup;}} db={firebase}/>

      </View>
    );
  }
}



const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  bottomBar: {
    position: 'absolute',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    bottom: 0,
    backgroundColor: '#2980b9'
  },
  centerButton: {
    position: 'relative',
    borderRadius: 20,
    margin: 10
  },
  filterButton: {
    position: 'relative',
    borderRadius: 20,
    margin: 10
  },
  thumbsUpButton: {
    width: 20,
    height: 20,
  },
  thumbsDownButton: {
    width: 20,
    height: 20,
  },
  reportButton: {
    borderRadius: 20
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  filterModal: {
    flex: .5,
    backgroundColor: '#fff',
  },
  eventModal: {
     flex: .5, 
     flexDirection: 'column',
     alignItems: 'center',
     backgroundColor: '#fff',
  },
  accountButton: {
    borderRadius:20,
    margin: 10
  },
  eventName: {
    fontSize: 30,
    color: 'black',
    fontWeight: '500',
    marginTop: 15,    
  },
  eventDetails: {
    fontSize: 20,
    color: '#616a77',
    fontWeight: '300',
    marginTop: 10,
    textDecorationLine: 'underline',
  },  
});
