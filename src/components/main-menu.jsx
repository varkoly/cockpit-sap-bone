import React, { useState } from 'react';
import { Card, CardBody, CardHeader, CardTitle } from "@patternfly/react-core/dist/esm/components/Card/index.js";
import cockpit from 'cockpit';
import { Nav, NavItem, NavList } from '@patternfly/react-core/dist/esm/components/Nav';
import { Installation } from './installation';
import { InstalledSystem } from './installed-system';
const _ = cockpit.gettext;

export default function MainMenu(props){
    const [activeItem, setActiveItem] = useState('installed');
    const onSelect = (_event, result) => {
        setActiveItem(result.itemId)
    };

    return (
            <Card>
                {props.os.NAME == "SLES" ?
                    <CardTitle>{_("SAP Bussiness One Installer")}</CardTitle>
                    :
                    <CardTitle>{_("SAP Product Installer")}</CardTitle>
                }
                <CardHeader>
                    <Nav onSelect={onSelect} variant='horizontal-subnav'>
                        <NavList>
                            <NavItem preventDefault itemId="installed" key="installed" isActive={activeItem == 'installed'}>{_('Installed SAP Instants')}</NavItem>
                        </NavList>
                        <NavList>
                            <NavItem preventDefault itemId="install" key="install" isActive={activeItem == 'install'}>{_('Install SAP Products')}</NavItem>
                        </NavList>
                    </Nav>
                </CardHeader>
                <CardBody>
                    {activeItem == 'install' && <Installation os={props.os}/>}
                    {activeItem == 'installed' && <InstalledSystem />}
                </CardBody>
            </Card>
            
    )
};
