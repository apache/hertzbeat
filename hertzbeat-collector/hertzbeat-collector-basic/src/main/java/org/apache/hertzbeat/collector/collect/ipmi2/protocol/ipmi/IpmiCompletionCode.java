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
import org.apache.hertzbeat.collector.collect.ipmi2.utils.ByteConvertUtils;

/**
 *  See IPMIv2 Section 5.2
 */
public enum IpmiCompletionCode implements IpmiCode.Code {
    CompletedNormally(0x00, "Command Completed Normally."),
    NodeBusy(0xC0, "Node Busy. Command could not be processed because command processing resources are temporarily unavailable."),
    InvalidCommand(0xC1, "Invalid Command. Used to indicate an unrecognized or unsupported command."),
    InvalidForGivenLUN(0xC2, "Command invalid for given LUN."),
    Timeout(0xC3, "Timeout while processing command. Response unavailable."),
    OutOfSpace(0xC4, "Out of space. Command could not be completed because of a lack of storage space required to execute the given command operation."),
    ReservationCanceled(0xC5, "Reservation Canceled or Invalid Reservation ID."),
    RequestDataTruncated(0xC6, "Request data truncated."),
    RequestDataLengthInvalid(0xC7, "Request data length invalid."),
    RequestDataFieldLengthExceed(0xC8, "Request data field length limit exceeded."),
    ParameterOutOfRange(0xC9, "Parameter out of range. "),
    CannotReturnRequestedData(0xCA, "Cannot return number of requested data bytes."),
    RequestDataNotPresent(0xCB, "Requested Sensor, data, or record not present"),
    InvalidDataFieldRequest(0xCC, "Invalid data field in Request"),
    CommandIllegalForSDR(0xCD, "Command illegal for specified sensor or record type."),
    CommandResponseNotProvided(0xCE, "Command response could not be provided."),
    DuplicateRequest(0xCF, "Cannot execute duplicated request. "),
    SDRRepositoryInUpdateMode(0xD0, "Command response could not be provided. SDR Repository in update mode"),
    FirmwareUpdateMode(0xD1, "Command response could not be provided. Device in firmware update mode."),
    BMCInitialization(0xD2, "Command response could not be provided. BMC initialization or initialization agent in progress."),
    DestinationUnavailable(0xD3, "Destination unavailable. Cannot deliver request to selected destination."),
    InsufficientPrivilege(0xD4, "Cannot execute command due to insufficient privilege level or other security-based restriction (e.g. disabled for 'firmware firewall)"),
    NotSupportedCommand(0xD5, "Cannot execute command. Command, or request parameter(s), not supported in present state."),
    ParameterIllegal(0xD6, "Cannot execute command. Parameter is illegal because command sub-function has been disabled or is unavailable (e.g. disabled for 'firmware firewall')."),
    UnspecifiedError(0xFF, "Unspecified error.")
    ;


    private final byte code;
    private final String description;

    public static final int MASK = 0xFF;

    private IpmiCompletionCode(int code, String description) {
        this.code = ByteConvertUtils.checkCastByte(code);
        this.description = description;
    }

    @Override
    public byte getCode() {
        return code;
    }

    @Override
    public String getDescription() {
        return description;
    }

}
