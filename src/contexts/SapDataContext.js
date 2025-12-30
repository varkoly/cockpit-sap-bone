// @ts-nocheck
// SapDataContext.js
import React, { createContext, useEffect, useState } from 'react';
import cockpit from 'cockpit';
import { read_os_release } from 'os-release'

// Erstelle einen initialen Zustand mit deiner komplexen Struktur
const initialSapData = {
    processes: {},
    activeTab: "",
    installations: [],
    installation: {
        sid: "",
        instNumber: "",
        adminPw: "",
        xsRouting: "",
        xsDomain: "",
        hanaUrlProtocol: "",
        hanaUrlPath: "",
        productUrlProtocol: "",
        productUrlPath: "",
        hosts: "localhost",
        device: "",
        logFile: "",
        result: "",
        master: "",
    },
    ha_setup: {
        type: "",
        timeIsSynched: false,
        watchDogs: [],
        logFile: "",
        result: "",
        fencing: {
            devices: [],
            sbdOptions: "",
            sbdDelayedStart: false,
        },
        cluster: {
            name: "",
            enableSecAuth: false,
            enableCsync2: false,
            expectedVotes: ""
        },
        hana: {},
    },
    update: {},
    firewall: {},
};

export const SapDataContext = createContext(initialSapData);

export const SapDataProvider = ({ children }) => {
    const [sapData, setSapData] = useState(initialSapData);

    const updateSapData = (newData) => {
        setSapData(prevData => ({ ...prevData, ...newData }));
    };

    const updateNestedSapData = (path, value) => {
        setSapData(prevData => {
            // Erstelle eine tiefe Kopie des vorherigen Zustands
            const newData = JSON.parse(JSON.stringify(prevData));

            // Splitte den Pfad, um durch das Objekt zu navigieren
            const keys = path.split('.');
            let current = newData;

            // Iteriere bis zum vorletzten Schlüssel
            for (let i = 0; i < keys.length - 1; i++) {
                current = current[keys[i]];
            }

            // Setze den Wert des letzten Schlüssels
            current[keys[keys.length - 1]] = value;

            return newData;
        });
    };

    useEffect(()=>{
        cockpit.spawn(['hostname']).then(
            (val) => {
                console.log(val)
                updateNestedSapData('installation.hosts',val.trim())
            }
        )
    },[])
    
    return (
        <SapDataContext.Provider value={{ sapData, updateSapData, updateNestedSapData }}>
            {children}
        </SapDataContext.Provider>
    );
};
