// ts-nocheck
/*
 * This file is part of Cockpit.
 *
 * Copyright (C) 2017 Red Hat, Inc.
 *
 * Cockpit is free software; you can redistribute it and/or modify it
 * under the terms of the GNU Lesser General Public License as published by
 * the Free Software Foundation; either version 2.1 of the License, or
 * (at your option) any later version.
 *
 * Cockpit is distributed in the hope that it will be useful, but
 * WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the GNU
 * Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public License
 * along with Cockpit; If not, see <http://www.gnu.org/licenses/>.
 */

import React, { useEffect, useState } from 'react';
import { EmptyStatePanel } from "cockpit-components-empty-state.jsx";
import cockpit from 'cockpit';
import { read_os_release } from 'os-release';
import { SapDataProvider } from './contexts/SapDataContext';
import disks from './common/disks';
import MainMenu  from './components/main-menu';

const _ = cockpit.gettext;
export const Application = () => {
    const [initialized, setInitialized] = useState(false);
    const [osRelease, setOsRelease] = useState({});

    useEffect(() => {
        disks.init(() => {
            console.log("Disks Initialized")
            read_os_release().then(
                (val) => {
                    setOsRelease(val)
                    setInitialized(true)
                }
            )
        })

    }, []);

    if (initialized) {
        return (
            <SapDataProvider>
                <MainMenu os={osRelease}></MainMenu>
            </SapDataProvider>
        );
    } else {
        return (
               <EmptyStatePanel loading title={_("Loading...")} />
        )
    }
};
