/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi;

import org.apache.hertzbeat.collector.collect.ipmi2.protocol.common.IpmiCode;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.IpmiRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.IpmiResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.chassis.GetChassisStatusRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.chassis.GetChassisStatusResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.messaging.CloseSessionRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.messaging.CloseSessionResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.messaging.GetChannelAuthenticationCapabilitiesRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.messaging.GetChannelAuthenticationCapabilitiesResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.GetSdrRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.GetSdrResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.GetSensorReadingRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.GetSensorReadingResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.ReserveSdrRepositoryRequest;
import org.apache.hertzbeat.collector.collect.ipmi2.protocol.ipmi.command.sdr.ReserveSdrRepositoryResponse;
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Appendix G
 */
public enum IpmiCommandName implements IpmiCode.Code {

    GetChassisStatus("Get Chassis Status", IpmiNetworkFunctionCode.Chassis, 0x01,
            IpmiChannelPrivilegeLevel.User, GetChassisStatusRequest.class, GetChassisStatusResponse.class),
    GetChannelAuthenticationCapabilities("Get Channel Authentication Capabilities", IpmiNetworkFunctionCode.App,
            0x38, IpmiChannelPrivilegeLevel.User, GetChannelAuthenticationCapabilitiesRequest.class, GetChannelAuthenticationCapabilitiesResponse.class),
    CloseSession("Close Session", IpmiNetworkFunctionCode.App, 0x3C, IpmiChannelPrivilegeLevel.Callback,
            CloseSessionRequest.class, CloseSessionResponse.class),
    ReserveSdrRepository("Reserve SDR Repository", IpmiNetworkFunctionCode.Storage, 0x22, IpmiChannelPrivilegeLevel.User,
            ReserveSdrRepositoryRequest.class, ReserveSdrRepositoryResponse.class),
    GetSdr("Get SDR", IpmiNetworkFunctionCode.Storage, 0x23, IpmiChannelPrivilegeLevel.User, GetSdrRequest.class, GetSdrResponse.class),
    GetSensorReading("Get Sensor Reading", IpmiNetworkFunctionCode.Sensor_Event, 0x2D, IpmiChannelPrivilegeLevel.User, GetSensorReadingRequest.class, GetSensorReadingResponse.class);

    private final String name;
    private final IpmiNetworkFunctionCode networkFunction;
    private final byte code;
    private final IpmiChannelPrivilegeLevel privilegeLevel;
    private final Class<? extends IpmiRequest> requestType;
    private final Class<? extends IpmiResponse> responseType;

    private IpmiCommandName(String name, IpmiNetworkFunctionCode networkFunction, int code, IpmiChannelPrivilegeLevel privilegeLevel,
                            Class<? extends IpmiRequest> requestType, Class<? extends IpmiResponse> responseType) {
        this.name = name;
        this.networkFunction = networkFunction;
        this.code = ByteConvertUtils.checkCastByte(code);
        this.privilegeLevel = privilegeLevel;
        this.requestType = requestType;
        this.responseType = responseType;
    }

    @Override
    public byte getCode() {
        return code;
    }

    public IpmiNetworkFunctionCode getNetworkFunction() {
        return networkFunction;
    }

    public static IpmiCommandName fromNetFunctionAndCode(IpmiNetworkFunctionCode networkFunction, byte code) {
        for (IpmiCommandName command : values()) {
            if (command.networkFunction == networkFunction && command.code == code) {
                return command;
            }
        }
        throw new UnsupportedOperationException("Unsupported command: " + networkFunction + " " + ByteConvertUtils.byteToInt(code));
    }

    public static IpmiResponse getResponseByRequest(Class<? extends IpmiRequest> request) {
        for (IpmiCommandName command : values()) {
            if (command.requestType.isInstance(request)) {
                IpmiResponse response = command.newIpmiResponse();
                if (command.responseType.isInstance(response)) {
                    return response;
                }
            }
        }
        throw new UnsupportedOperationException("Unsupported request: " + request);
    }

    public IpmiResponse newIpmiResponse() {
        try {
            return responseType.newInstance();
        } catch (InstantiationException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }

    public IpmiRequest newIpmiRequest() {
        try {
            return requestType.newInstance();
        } catch (InstantiationException | IllegalAccessException e) {
            throw new RuntimeException(e);
        }
    }



}
