#!/bin/bash

function clean {
  killall wpa_supplicant dhclient 2>/dev/null
  exit
}

trap clean SIGTERM SIGINT

iface=$1

#shut down interface
ifconfig $iface down

#set ad-hoc/management of wireless device
iwconfig $iface mode Managed

#enable interface
ifconfig $iface up

#stop any persistent wireless wpa2 sessions
killall wpa_supplicant dhclient 2>/dev/null

#apply WPA/WPA2 personal settings to device
wpa_supplicant -B -Dwext -i $iface -c ./wireless-wpa.conf -dd

#wait sometime before launching dhclient
sleep 5


#obtain an IP address
echo "Getting ip adress"
dhclient $iface
echo "Got ip!"
