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

package org.apache.hertzbeat.common.entity.message;

@SuppressWarnings("all")
public final class CollectRep {
  private CollectRep() {}
  public static void registerAllExtensions(
      com.google.protobuf.ExtensionRegistryLite registry) {
  }

  public static void registerAllExtensions(
      com.google.protobuf.ExtensionRegistry registry) {
    registerAllExtensions(
        (com.google.protobuf.ExtensionRegistryLite) registry);
  }
  /**
   * Protobuf enum {@code org.apache.hertzbeat.common.entity.message.Code}
   */
  public enum Code
      implements com.google.protobuf.ProtocolMessageEnum {
    /**
     * <pre>
     * collect success
     * </pre>
     *
     * <code>SUCCESS = 0;</code>
     */
    SUCCESS(0),
    /**
     * <pre>
     * collector not available
     * </pre>
     *
     * <code>UN_AVAILABLE = 1;</code>
     */
    UN_AVAILABLE(1),
    /**
     * <pre>
     * peer network un reachable(icmp)
     * </pre>
     *
     * <code>UN_REACHABLE = 2;</code>
     */
    UN_REACHABLE(2),
    /**
     * <pre>
     * peer network server un connectable(tcp,udp...)
     * </pre>
     *
     * <code>UN_CONNECTABLE = 3;</code>
     */
    UN_CONNECTABLE(3),
    /**
     * <pre>
     * collect metrics data failed(http,ssh,snmp...)
     * </pre>
     *
     * <code>FAIL = 4;</code>
     */
    FAIL(4),
    /**
     * <pre>
     * collect metrics data timeout
     * </pre>
     *
     * <code>TIMEOUT = 5;</code>
     */
    TIMEOUT(5),
    UNRECOGNIZED(-1),
    ;

    /**
     * <pre>
     * collect success
     * </pre>
     *
     * <code>SUCCESS = 0;</code>
     */
    public static final int SUCCESS_VALUE = 0;
    /**
     * <pre>
     * collector not available
     * </pre>
     *
     * <code>UN_AVAILABLE = 1;</code>
     */
    public static final int UN_AVAILABLE_VALUE = 1;
    /**
     * <pre>
     * peer network un reachable(icmp)
     * </pre>
     *
     * <code>UN_REACHABLE = 2;</code>
     */
    public static final int UN_REACHABLE_VALUE = 2;
    /**
     * <pre>
     * peer network server un connectable(tcp,udp...)
     * </pre>
     *
     * <code>UN_CONNECTABLE = 3;</code>
     */
    public static final int UN_CONNECTABLE_VALUE = 3;
    /**
     * <pre>
     * collect metrics data failed(http,ssh,snmp...)
     * </pre>
     *
     * <code>FAIL = 4;</code>
     */
    public static final int FAIL_VALUE = 4;
    /**
     * <pre>
     * collect metrics data timeout
     * </pre>
     *
     * <code>TIMEOUT = 5;</code>
     */
    public static final int TIMEOUT_VALUE = 5;


    public final int getNumber() {
      if (this == UNRECOGNIZED) {
        throw new IllegalArgumentException(
            "Can't get the number of an unknown enum value.");
      }
      return value;
    }

    /**
     * @param value The numeric wire value of the corresponding enum entry.
     * @return The enum associated with the given numeric wire value.
     * @deprecated Use {@link #forNumber(int)} instead.
     */
    @Deprecated
    public static Code valueOf(int value) {
      return forNumber(value);
    }

    /**
     * @param value The numeric wire value of the corresponding enum entry.
     * @return The enum associated with the given numeric wire value.
     */
    public static Code forNumber(int value) {
      switch (value) {
        case 0: return SUCCESS;
        case 1: return UN_AVAILABLE;
        case 2: return UN_REACHABLE;
        case 3: return UN_CONNECTABLE;
        case 4: return FAIL;
        case 5: return TIMEOUT;
        default: return null;
      }
    }

    public static com.google.protobuf.Internal.EnumLiteMap<Code>
        internalGetValueMap() {
      return internalValueMap;
    }
    private static final com.google.protobuf.Internal.EnumLiteMap<
        Code> internalValueMap =
          new com.google.protobuf.Internal.EnumLiteMap<Code>() {
            public Code findValueByNumber(int number) {
              return Code.forNumber(number);
            }
          };

    public final com.google.protobuf.Descriptors.EnumValueDescriptor
        getValueDescriptor() {
      if (this == UNRECOGNIZED) {
        throw new IllegalStateException(
            "Can't get the descriptor of an unrecognized enum value.");
      }
      return getDescriptor().getValues().get(ordinal());
    }
    public final com.google.protobuf.Descriptors.EnumDescriptor
        getDescriptorForType() {
      return getDescriptor();
    }
    public static final com.google.protobuf.Descriptors.EnumDescriptor
        getDescriptor() {
      return CollectRep.getDescriptor().getEnumTypes().get(0);
    }

    private static final Code[] VALUES = values();

    public static Code valueOf(
        com.google.protobuf.Descriptors.EnumValueDescriptor desc) {
      if (desc.getType() != getDescriptor()) {
        throw new IllegalArgumentException(
          "EnumValueDescriptor is not for this type.");
      }
      if (desc.getIndex() == -1) {
        return UNRECOGNIZED;
      }
      return VALUES[desc.getIndex()];
    }

    private final int value;

    private Code(int value) {
      this.value = value;
    }

    // @@protoc_insertion_point(enum_scope:org.apache.hertzbeat.common.entity.message.Code)
  }

  public interface MetricsDataOrBuilder extends
      // @@protoc_insertion_point(interface_extends:org.apache.hertzbeat.common.entity.message.MetricsData)
      com.google.protobuf.MessageOrBuilder {

    /**
     * <pre>
     * monitoring id
     * </pre>
     *
     * <code>uint64 id = 1;</code>
     * @return The id.
     */
    long getId();

    /**
     * <pre>
     * tenant id
     * </pre>
     *
     * <code>uint64 tenantId = 2;</code>
     * @return The tenantId.
     */
    long getTenantId();

    /**
     * <pre>
     * monitoring app eg: linux | mysql | jvm
     * </pre>
     *
     * <code>string app = 3;</code>
     * @return The app.
     */
    String getApp();
    /**
     * <pre>
     * monitoring app eg: linux | mysql | jvm
     * </pre>
     *
     * <code>string app = 3;</code>
     * @return The bytes for app.
     */
    com.google.protobuf.ByteString
        getAppBytes();

    /**
     * <pre>
     * monitoring metrics eg: cpu | memory | health
     * </pre>
     *
     * <code>string metrics = 4;</code>
     * @return The metrics.
     */
    String getMetrics();
    /**
     * <pre>
     * monitoring metrics eg: cpu | memory | health
     * </pre>
     *
     * <code>string metrics = 4;</code>
     * @return The bytes for metrics.
     */
    com.google.protobuf.ByteString
        getMetricsBytes();

    /**
     * <pre>
     * monitoring collect priority &gt;=0
     * </pre>
     *
     * <code>uint32 priority = 5;</code>
     * @return The priority.
     */
    int getPriority();

    /**
     * <pre>
     * collect timestamp
     * </pre>
     *
     * <code>uint64 time = 6;</code>
     * @return The time.
     */
    long getTime();

    /**
     * <pre>
     * collect response code
     * </pre>
     *
     * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
     * @return The enum numeric value on the wire for code.
     */
    int getCodeValue();
    /**
     * <pre>
     * collect response code
     * </pre>
     *
     * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
     * @return The code.
     */
    Code getCode();

    /**
     * <pre>
     * collect response error message
     * </pre>
     *
     * <code>string msg = 8;</code>
     * @return The msg.
     */
    String getMsg();
    /**
     * <pre>
     * collect response error message
     * </pre>
     *
     * <code>string msg = 8;</code>
     * @return The bytes for msg.
     */
    com.google.protobuf.ByteString
        getMsgBytes();

    /**
     * <pre>
     * collected metric data
     * </pre>
     *
     * <code>bytes data = 9;</code>
     * @return The data.
     */
    com.google.protobuf.ByteString getData();
  }
  /**
   * Protobuf type {@code org.apache.hertzbeat.common.entity.message.MetricsData}
   */
  public static final class MetricsData extends
      com.google.protobuf.GeneratedMessageV3 implements
      // @@protoc_insertion_point(message_implements:org.apache.hertzbeat.common.entity.message.MetricsData)
      MetricsDataOrBuilder {
  private static final long serialVersionUID = 0L;
    // Use MetricsData.newBuilder() to construct.
    private MetricsData(com.google.protobuf.GeneratedMessageV3.Builder<?> builder) {
      super(builder);
    }
    private MetricsData() {
      app_ = "";
      metrics_ = "";
      code_ = 0;
      msg_ = "";
      data_ = com.google.protobuf.ByteString.EMPTY;
    }

    @Override
    @SuppressWarnings({"unused"})
    protected Object newInstance(
        UnusedPrivateParameter unused) {
      return new MetricsData();
    }

    @Override
    public final com.google.protobuf.UnknownFieldSet
    getUnknownFields() {
      return this.unknownFields;
    }
    public static final com.google.protobuf.Descriptors.Descriptor
        getDescriptor() {
      return CollectRep.internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_descriptor;
    }

    @Override
    protected FieldAccessorTable
        internalGetFieldAccessorTable() {
      return CollectRep.internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_fieldAccessorTable
          .ensureFieldAccessorsInitialized(
              MetricsData.class, Builder.class);
    }

    public static final int ID_FIELD_NUMBER = 1;
    private long id_;
    /**
     * <pre>
     * monitoring id
     * </pre>
     *
     * <code>uint64 id = 1;</code>
     * @return The id.
     */
    @Override
    public long getId() {
      return id_;
    }

    public static final int TENANTID_FIELD_NUMBER = 2;
    private long tenantId_;
    /**
     * <pre>
     * tenant id
     * </pre>
     *
     * <code>uint64 tenantId = 2;</code>
     * @return The tenantId.
     */
    @Override
    public long getTenantId() {
      return tenantId_;
    }

    public static final int APP_FIELD_NUMBER = 3;
    private volatile Object app_;
    /**
     * <pre>
     * monitoring app eg: linux | mysql | jvm
     * </pre>
     *
     * <code>string app = 3;</code>
     * @return The app.
     */
    @Override
    public String getApp() {
      Object ref = app_;
      if (ref instanceof String) {
        return (String) ref;
      } else {
        com.google.protobuf.ByteString bs = 
            (com.google.protobuf.ByteString) ref;
        String s = bs.toStringUtf8();
        app_ = s;
        return s;
      }
    }
    /**
     * <pre>
     * monitoring app eg: linux | mysql | jvm
     * </pre>
     *
     * <code>string app = 3;</code>
     * @return The bytes for app.
     */
    @Override
    public com.google.protobuf.ByteString
        getAppBytes() {
      Object ref = app_;
      if (ref instanceof String) {
        com.google.protobuf.ByteString b = 
            com.google.protobuf.ByteString.copyFromUtf8(
                (String) ref);
        app_ = b;
        return b;
      } else {
        return (com.google.protobuf.ByteString) ref;
      }
    }

    public static final int METRICS_FIELD_NUMBER = 4;
    private volatile Object metrics_;
    /**
     * <pre>
     * monitoring metrics eg: cpu | memory | health
     * </pre>
     *
     * <code>string metrics = 4;</code>
     * @return The metrics.
     */
    @Override
    public String getMetrics() {
      Object ref = metrics_;
      if (ref instanceof String) {
        return (String) ref;
      } else {
        com.google.protobuf.ByteString bs = 
            (com.google.protobuf.ByteString) ref;
        String s = bs.toStringUtf8();
        metrics_ = s;
        return s;
      }
    }
    /**
     * <pre>
     * monitoring metrics eg: cpu | memory | health
     * </pre>
     *
     * <code>string metrics = 4;</code>
     * @return The bytes for metrics.
     */
    @Override
    public com.google.protobuf.ByteString
        getMetricsBytes() {
      Object ref = metrics_;
      if (ref instanceof String) {
        com.google.protobuf.ByteString b = 
            com.google.protobuf.ByteString.copyFromUtf8(
                (String) ref);
        metrics_ = b;
        return b;
      } else {
        return (com.google.protobuf.ByteString) ref;
      }
    }

    public static final int PRIORITY_FIELD_NUMBER = 5;
    private int priority_;
    /**
     * <pre>
     * monitoring collect priority &gt;=0
     * </pre>
     *
     * <code>uint32 priority = 5;</code>
     * @return The priority.
     */
    @Override
    public int getPriority() {
      return priority_;
    }

    public static final int TIME_FIELD_NUMBER = 6;
    private long time_;
    /**
     * <pre>
     * collect timestamp
     * </pre>
     *
     * <code>uint64 time = 6;</code>
     * @return The time.
     */
    @Override
    public long getTime() {
      return time_;
    }

    public static final int CODE_FIELD_NUMBER = 7;
    private int code_;
    /**
     * <pre>
     * collect response code
     * </pre>
     *
     * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
     * @return The enum numeric value on the wire for code.
     */
    @Override public int getCodeValue() {
      return code_;
    }
    /**
     * <pre>
     * collect response code
     * </pre>
     *
     * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
     * @return The code.
     */
    @Override public Code getCode() {
      @SuppressWarnings("deprecation")
      Code result = Code.valueOf(code_);
      return result == null ? Code.UNRECOGNIZED : result;
    }

    public static final int MSG_FIELD_NUMBER = 8;
    private volatile Object msg_;
    /**
     * <pre>
     * collect response error message
     * </pre>
     *
     * <code>string msg = 8;</code>
     * @return The msg.
     */
    @Override
    public String getMsg() {
      Object ref = msg_;
      if (ref instanceof String) {
        return (String) ref;
      } else {
        com.google.protobuf.ByteString bs = 
            (com.google.protobuf.ByteString) ref;
        String s = bs.toStringUtf8();
        msg_ = s;
        return s;
      }
    }
    /**
     * <pre>
     * collect response error message
     * </pre>
     *
     * <code>string msg = 8;</code>
     * @return The bytes for msg.
     */
    @Override
    public com.google.protobuf.ByteString
        getMsgBytes() {
      Object ref = msg_;
      if (ref instanceof String) {
        com.google.protobuf.ByteString b = 
            com.google.protobuf.ByteString.copyFromUtf8(
                (String) ref);
        msg_ = b;
        return b;
      } else {
        return (com.google.protobuf.ByteString) ref;
      }
    }

    public static final int DATA_FIELD_NUMBER = 9;
    private com.google.protobuf.ByteString data_;
    /**
     * <pre>
     * collected metric data
     * </pre>
     *
     * <code>bytes data = 9;</code>
     * @return The data.
     */
    @Override
    public com.google.protobuf.ByteString getData() {
      return data_;
    }

    private byte memoizedIsInitialized = -1;
    @Override
    public final boolean isInitialized() {
      byte isInitialized = memoizedIsInitialized;
      if (isInitialized == 1) return true;
      if (isInitialized == 0) return false;

      memoizedIsInitialized = 1;
      return true;
    }

    @Override
    public void writeTo(com.google.protobuf.CodedOutputStream output)
                        throws java.io.IOException {
      if (id_ != 0L) {
        output.writeUInt64(1, id_);
      }
      if (tenantId_ != 0L) {
        output.writeUInt64(2, tenantId_);
      }
      if (!com.google.protobuf.GeneratedMessageV3.isStringEmpty(app_)) {
        com.google.protobuf.GeneratedMessageV3.writeString(output, 3, app_);
      }
      if (!com.google.protobuf.GeneratedMessageV3.isStringEmpty(metrics_)) {
        com.google.protobuf.GeneratedMessageV3.writeString(output, 4, metrics_);
      }
      if (priority_ != 0) {
        output.writeUInt32(5, priority_);
      }
      if (time_ != 0L) {
        output.writeUInt64(6, time_);
      }
      if (code_ != Code.SUCCESS.getNumber()) {
        output.writeEnum(7, code_);
      }
      if (!com.google.protobuf.GeneratedMessageV3.isStringEmpty(msg_)) {
        com.google.protobuf.GeneratedMessageV3.writeString(output, 8, msg_);
      }
      if (!data_.isEmpty()) {
        output.writeBytes(9, data_);
      }
      getUnknownFields().writeTo(output);
    }

    @Override
    public int getSerializedSize() {
      int size = memoizedSize;
      if (size != -1) return size;

      size = 0;
      if (id_ != 0L) {
        size += com.google.protobuf.CodedOutputStream
          .computeUInt64Size(1, id_);
      }
      if (tenantId_ != 0L) {
        size += com.google.protobuf.CodedOutputStream
          .computeUInt64Size(2, tenantId_);
      }
      if (!com.google.protobuf.GeneratedMessageV3.isStringEmpty(app_)) {
        size += com.google.protobuf.GeneratedMessageV3.computeStringSize(3, app_);
      }
      if (!com.google.protobuf.GeneratedMessageV3.isStringEmpty(metrics_)) {
        size += com.google.protobuf.GeneratedMessageV3.computeStringSize(4, metrics_);
      }
      if (priority_ != 0) {
        size += com.google.protobuf.CodedOutputStream
          .computeUInt32Size(5, priority_);
      }
      if (time_ != 0L) {
        size += com.google.protobuf.CodedOutputStream
          .computeUInt64Size(6, time_);
      }
      if (code_ != Code.SUCCESS.getNumber()) {
        size += com.google.protobuf.CodedOutputStream
          .computeEnumSize(7, code_);
      }
      if (!com.google.protobuf.GeneratedMessageV3.isStringEmpty(msg_)) {
        size += com.google.protobuf.GeneratedMessageV3.computeStringSize(8, msg_);
      }
      if (!data_.isEmpty()) {
        size += com.google.protobuf.CodedOutputStream
          .computeBytesSize(9, data_);
      }
      size += getUnknownFields().getSerializedSize();
      memoizedSize = size;
      return size;
    }

    @Override
    public boolean equals(final Object obj) {
      if (obj == this) {
       return true;
      }
      if (!(obj instanceof MetricsData)) {
        return super.equals(obj);
      }
      MetricsData other = (MetricsData) obj;

      if (getId()
          != other.getId()) return false;
      if (getTenantId()
          != other.getTenantId()) return false;
      if (!getApp()
          .equals(other.getApp())) return false;
      if (!getMetrics()
          .equals(other.getMetrics())) return false;
      if (getPriority()
          != other.getPriority()) return false;
      if (getTime()
          != other.getTime()) return false;
      if (code_ != other.code_) return false;
      if (!getMsg()
          .equals(other.getMsg())) return false;
      if (!getData()
          .equals(other.getData())) return false;
      if (!getUnknownFields().equals(other.getUnknownFields())) return false;
      return true;
    }

    @Override
    public int hashCode() {
      if (memoizedHashCode != 0) {
        return memoizedHashCode;
      }
      int hash = 41;
      hash = (19 * hash) + getDescriptor().hashCode();
      hash = (37 * hash) + ID_FIELD_NUMBER;
      hash = (53 * hash) + com.google.protobuf.Internal.hashLong(
          getId());
      hash = (37 * hash) + TENANTID_FIELD_NUMBER;
      hash = (53 * hash) + com.google.protobuf.Internal.hashLong(
          getTenantId());
      hash = (37 * hash) + APP_FIELD_NUMBER;
      hash = (53 * hash) + getApp().hashCode();
      hash = (37 * hash) + METRICS_FIELD_NUMBER;
      hash = (53 * hash) + getMetrics().hashCode();
      hash = (37 * hash) + PRIORITY_FIELD_NUMBER;
      hash = (53 * hash) + getPriority();
      hash = (37 * hash) + TIME_FIELD_NUMBER;
      hash = (53 * hash) + com.google.protobuf.Internal.hashLong(
          getTime());
      hash = (37 * hash) + CODE_FIELD_NUMBER;
      hash = (53 * hash) + code_;
      hash = (37 * hash) + MSG_FIELD_NUMBER;
      hash = (53 * hash) + getMsg().hashCode();
      hash = (37 * hash) + DATA_FIELD_NUMBER;
      hash = (53 * hash) + getData().hashCode();
      hash = (29 * hash) + getUnknownFields().hashCode();
      memoizedHashCode = hash;
      return hash;
    }

    public static MetricsData parseFrom(
        java.nio.ByteBuffer data)
        throws com.google.protobuf.InvalidProtocolBufferException {
      return PARSER.parseFrom(data);
    }
    public static MetricsData parseFrom(
        java.nio.ByteBuffer data,
        com.google.protobuf.ExtensionRegistryLite extensionRegistry)
        throws com.google.protobuf.InvalidProtocolBufferException {
      return PARSER.parseFrom(data, extensionRegistry);
    }
    public static MetricsData parseFrom(
        com.google.protobuf.ByteString data)
        throws com.google.protobuf.InvalidProtocolBufferException {
      return PARSER.parseFrom(data);
    }
    public static MetricsData parseFrom(
        com.google.protobuf.ByteString data,
        com.google.protobuf.ExtensionRegistryLite extensionRegistry)
        throws com.google.protobuf.InvalidProtocolBufferException {
      return PARSER.parseFrom(data, extensionRegistry);
    }
    public static MetricsData parseFrom(byte[] data)
        throws com.google.protobuf.InvalidProtocolBufferException {
      return PARSER.parseFrom(data);
    }
    public static MetricsData parseFrom(
        byte[] data,
        com.google.protobuf.ExtensionRegistryLite extensionRegistry)
        throws com.google.protobuf.InvalidProtocolBufferException {
      return PARSER.parseFrom(data, extensionRegistry);
    }
    public static MetricsData parseFrom(java.io.InputStream input)
        throws java.io.IOException {
      return com.google.protobuf.GeneratedMessageV3
          .parseWithIOException(PARSER, input);
    }
    public static MetricsData parseFrom(
        java.io.InputStream input,
        com.google.protobuf.ExtensionRegistryLite extensionRegistry)
        throws java.io.IOException {
      return com.google.protobuf.GeneratedMessageV3
          .parseWithIOException(PARSER, input, extensionRegistry);
    }
    public static MetricsData parseDelimitedFrom(java.io.InputStream input)
        throws java.io.IOException {
      return com.google.protobuf.GeneratedMessageV3
          .parseDelimitedWithIOException(PARSER, input);
    }
    public static MetricsData parseDelimitedFrom(
        java.io.InputStream input,
        com.google.protobuf.ExtensionRegistryLite extensionRegistry)
        throws java.io.IOException {
      return com.google.protobuf.GeneratedMessageV3
          .parseDelimitedWithIOException(PARSER, input, extensionRegistry);
    }
    public static MetricsData parseFrom(
        com.google.protobuf.CodedInputStream input)
        throws java.io.IOException {
      return com.google.protobuf.GeneratedMessageV3
          .parseWithIOException(PARSER, input);
    }
    public static MetricsData parseFrom(
        com.google.protobuf.CodedInputStream input,
        com.google.protobuf.ExtensionRegistryLite extensionRegistry)
        throws java.io.IOException {
      return com.google.protobuf.GeneratedMessageV3
          .parseWithIOException(PARSER, input, extensionRegistry);
    }

    @Override
    public Builder newBuilderForType() { return newBuilder(); }
    public static Builder newBuilder() {
      return DEFAULT_INSTANCE.toBuilder();
    }
    public static Builder newBuilder(MetricsData prototype) {
      return DEFAULT_INSTANCE.toBuilder().mergeFrom(prototype);
    }
    @Override
    public Builder toBuilder() {
      return this == DEFAULT_INSTANCE
          ? new Builder() : new Builder().mergeFrom(this);
    }

    @Override
    protected Builder newBuilderForType(
        BuilderParent parent) {
      Builder builder = new Builder(parent);
      return builder;
    }
    /**
     * Protobuf type {@code org.apache.hertzbeat.common.entity.message.MetricsData}
     */
    public static final class Builder extends
        com.google.protobuf.GeneratedMessageV3.Builder<Builder> implements
        // @@protoc_insertion_point(builder_implements:org.apache.hertzbeat.common.entity.message.MetricsData)
        MetricsDataOrBuilder {
      public static final com.google.protobuf.Descriptors.Descriptor
          getDescriptor() {
        return CollectRep.internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_descriptor;
      }

      @Override
      protected FieldAccessorTable
          internalGetFieldAccessorTable() {
        return CollectRep.internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_fieldAccessorTable
            .ensureFieldAccessorsInitialized(
                MetricsData.class, Builder.class);
      }

      // Construct using org.apache.hertzbeat.common.entity.message.CollectRep.MetricsData.newBuilder()
      private Builder() {

      }

      private Builder(
          BuilderParent parent) {
        super(parent);

      }
      @Override
      public Builder clear() {
        super.clear();
        id_ = 0L;

        tenantId_ = 0L;

        app_ = "";

        metrics_ = "";

        priority_ = 0;

        time_ = 0L;

        code_ = 0;

        msg_ = "";

        data_ = com.google.protobuf.ByteString.EMPTY;

        return this;
      }

      @Override
      public com.google.protobuf.Descriptors.Descriptor
          getDescriptorForType() {
        return CollectRep.internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_descriptor;
      }

      @Override
      public MetricsData getDefaultInstanceForType() {
        return MetricsData.getDefaultInstance();
      }

      @Override
      public MetricsData build() {
        MetricsData result = buildPartial();
        if (!result.isInitialized()) {
          throw newUninitializedMessageException(result);
        }
        return result;
      }

      @Override
      public MetricsData buildPartial() {
        MetricsData result = new MetricsData(this);
        result.id_ = id_;
        result.tenantId_ = tenantId_;
        result.app_ = app_;
        result.metrics_ = metrics_;
        result.priority_ = priority_;
        result.time_ = time_;
        result.code_ = code_;
        result.msg_ = msg_;
        result.data_ = data_;
        onBuilt();
        return result;
      }

      @Override
      public Builder clone() {
        return super.clone();
      }
      @Override
      public Builder setField(
          com.google.protobuf.Descriptors.FieldDescriptor field,
          Object value) {
        return super.setField(field, value);
      }
      @Override
      public Builder clearField(
          com.google.protobuf.Descriptors.FieldDescriptor field) {
        return super.clearField(field);
      }
      @Override
      public Builder clearOneof(
          com.google.protobuf.Descriptors.OneofDescriptor oneof) {
        return super.clearOneof(oneof);
      }
      @Override
      public Builder setRepeatedField(
          com.google.protobuf.Descriptors.FieldDescriptor field,
          int index, Object value) {
        return super.setRepeatedField(field, index, value);
      }
      @Override
      public Builder addRepeatedField(
          com.google.protobuf.Descriptors.FieldDescriptor field,
          Object value) {
        return super.addRepeatedField(field, value);
      }
      @Override
      public Builder mergeFrom(com.google.protobuf.Message other) {
        if (other instanceof MetricsData) {
          return mergeFrom((MetricsData)other);
        } else {
          super.mergeFrom(other);
          return this;
        }
      }

      public Builder mergeFrom(MetricsData other) {
        if (other == MetricsData.getDefaultInstance()) return this;
        if (other.getId() != 0L) {
          setId(other.getId());
        }
        if (other.getTenantId() != 0L) {
          setTenantId(other.getTenantId());
        }
        if (!other.getApp().isEmpty()) {
          app_ = other.app_;
          onChanged();
        }
        if (!other.getMetrics().isEmpty()) {
          metrics_ = other.metrics_;
          onChanged();
        }
        if (other.getPriority() != 0) {
          setPriority(other.getPriority());
        }
        if (other.getTime() != 0L) {
          setTime(other.getTime());
        }
        if (other.code_ != 0) {
          setCodeValue(other.getCodeValue());
        }
        if (!other.getMsg().isEmpty()) {
          msg_ = other.msg_;
          onChanged();
        }
        if (other.getData() != com.google.protobuf.ByteString.EMPTY) {
          setData(other.getData());
        }
        this.mergeUnknownFields(other.getUnknownFields());
        onChanged();
        return this;
      }

      @Override
      public final boolean isInitialized() {
        return true;
      }

      @Override
      public Builder mergeFrom(
          com.google.protobuf.CodedInputStream input,
          com.google.protobuf.ExtensionRegistryLite extensionRegistry)
          throws java.io.IOException {
        if (extensionRegistry == null) {
          throw new NullPointerException();
        }
        try {
          boolean done = false;
          while (!done) {
            int tag = input.readTag();
            switch (tag) {
              case 0:
                done = true;
                break;
              case 8: {
                id_ = input.readUInt64();

                break;
              } // case 8
              case 16: {
                tenantId_ = input.readUInt64();

                break;
              } // case 16
              case 26: {
                app_ = input.readStringRequireUtf8();

                break;
              } // case 26
              case 34: {
                metrics_ = input.readStringRequireUtf8();

                break;
              } // case 34
              case 40: {
                priority_ = input.readUInt32();

                break;
              } // case 40
              case 48: {
                time_ = input.readUInt64();

                break;
              } // case 48
              case 56: {
                code_ = input.readEnum();

                break;
              } // case 56
              case 66: {
                msg_ = input.readStringRequireUtf8();

                break;
              } // case 66
              case 74: {
                data_ = input.readBytes();

                break;
              } // case 74
              default: {
                if (!super.parseUnknownField(input, extensionRegistry, tag)) {
                  done = true; // was an endgroup tag
                }
                break;
              } // default:
            } // switch (tag)
          } // while (!done)
        } catch (com.google.protobuf.InvalidProtocolBufferException e) {
          throw e.unwrapIOException();
        } finally {
          onChanged();
        } // finally
        return this;
      }

      private long id_ ;
      /**
       * <pre>
       * monitoring id
       * </pre>
       *
       * <code>uint64 id = 1;</code>
       * @return The id.
       */
      @Override
      public long getId() {
        return id_;
      }
      /**
       * <pre>
       * monitoring id
       * </pre>
       *
       * <code>uint64 id = 1;</code>
       * @param value The id to set.
       * @return This builder for chaining.
       */
      public Builder setId(long value) {
        
        id_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * monitoring id
       * </pre>
       *
       * <code>uint64 id = 1;</code>
       * @return This builder for chaining.
       */
      public Builder clearId() {
        
        id_ = 0L;
        onChanged();
        return this;
      }

      private long tenantId_ ;
      /**
       * <pre>
       * tenant id
       * </pre>
       *
       * <code>uint64 tenantId = 2;</code>
       * @return The tenantId.
       */
      @Override
      public long getTenantId() {
        return tenantId_;
      }
      /**
       * <pre>
       * tenant id
       * </pre>
       *
       * <code>uint64 tenantId = 2;</code>
       * @param value The tenantId to set.
       * @return This builder for chaining.
       */
      public Builder setTenantId(long value) {
        
        tenantId_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * tenant id
       * </pre>
       *
       * <code>uint64 tenantId = 2;</code>
       * @return This builder for chaining.
       */
      public Builder clearTenantId() {
        
        tenantId_ = 0L;
        onChanged();
        return this;
      }

      private Object app_ = "";
      /**
       * <pre>
       * monitoring app eg: linux | mysql | jvm
       * </pre>
       *
       * <code>string app = 3;</code>
       * @return The app.
       */
      public String getApp() {
        Object ref = app_;
        if (!(ref instanceof String)) {
          com.google.protobuf.ByteString bs =
              (com.google.protobuf.ByteString) ref;
          String s = bs.toStringUtf8();
          app_ = s;
          return s;
        } else {
          return (String) ref;
        }
      }
      /**
       * <pre>
       * monitoring app eg: linux | mysql | jvm
       * </pre>
       *
       * <code>string app = 3;</code>
       * @return The bytes for app.
       */
      public com.google.protobuf.ByteString
          getAppBytes() {
        Object ref = app_;
        if (ref instanceof String) {
          com.google.protobuf.ByteString b = 
              com.google.protobuf.ByteString.copyFromUtf8(
                  (String) ref);
          app_ = b;
          return b;
        } else {
          return (com.google.protobuf.ByteString) ref;
        }
      }
      /**
       * <pre>
       * monitoring app eg: linux | mysql | jvm
       * </pre>
       *
       * <code>string app = 3;</code>
       * @param value The app to set.
       * @return This builder for chaining.
       */
      public Builder setApp(
          String value) {
        if (value == null) {
    throw new NullPointerException();
  }
  
        app_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * monitoring app eg: linux | mysql | jvm
       * </pre>
       *
       * <code>string app = 3;</code>
       * @return This builder for chaining.
       */
      public Builder clearApp() {
        
        app_ = getDefaultInstance().getApp();
        onChanged();
        return this;
      }
      /**
       * <pre>
       * monitoring app eg: linux | mysql | jvm
       * </pre>
       *
       * <code>string app = 3;</code>
       * @param value The bytes for app to set.
       * @return This builder for chaining.
       */
      public Builder setAppBytes(
          com.google.protobuf.ByteString value) {
        if (value == null) {
    throw new NullPointerException();
  }
  checkByteStringIsUtf8(value);
        
        app_ = value;
        onChanged();
        return this;
      }

      private Object metrics_ = "";
      /**
       * <pre>
       * monitoring metrics eg: cpu | memory | health
       * </pre>
       *
       * <code>string metrics = 4;</code>
       * @return The metrics.
       */
      public String getMetrics() {
        Object ref = metrics_;
        if (!(ref instanceof String)) {
          com.google.protobuf.ByteString bs =
              (com.google.protobuf.ByteString) ref;
          String s = bs.toStringUtf8();
          metrics_ = s;
          return s;
        } else {
          return (String) ref;
        }
      }
      /**
       * <pre>
       * monitoring metrics eg: cpu | memory | health
       * </pre>
       *
       * <code>string metrics = 4;</code>
       * @return The bytes for metrics.
       */
      public com.google.protobuf.ByteString
          getMetricsBytes() {
        Object ref = metrics_;
        if (ref instanceof String) {
          com.google.protobuf.ByteString b = 
              com.google.protobuf.ByteString.copyFromUtf8(
                  (String) ref);
          metrics_ = b;
          return b;
        } else {
          return (com.google.protobuf.ByteString) ref;
        }
      }
      /**
       * <pre>
       * monitoring metrics eg: cpu | memory | health
       * </pre>
       *
       * <code>string metrics = 4;</code>
       * @param value The metrics to set.
       * @return This builder for chaining.
       */
      public Builder setMetrics(
          String value) {
        if (value == null) {
    throw new NullPointerException();
  }
  
        metrics_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * monitoring metrics eg: cpu | memory | health
       * </pre>
       *
       * <code>string metrics = 4;</code>
       * @return This builder for chaining.
       */
      public Builder clearMetrics() {
        
        metrics_ = getDefaultInstance().getMetrics();
        onChanged();
        return this;
      }
      /**
       * <pre>
       * monitoring metrics eg: cpu | memory | health
       * </pre>
       *
       * <code>string metrics = 4;</code>
       * @param value The bytes for metrics to set.
       * @return This builder for chaining.
       */
      public Builder setMetricsBytes(
          com.google.protobuf.ByteString value) {
        if (value == null) {
    throw new NullPointerException();
  }
  checkByteStringIsUtf8(value);
        
        metrics_ = value;
        onChanged();
        return this;
      }

      private int priority_ ;
      /**
       * <pre>
       * monitoring collect priority &gt;=0
       * </pre>
       *
       * <code>uint32 priority = 5;</code>
       * @return The priority.
       */
      @Override
      public int getPriority() {
        return priority_;
      }
      /**
       * <pre>
       * monitoring collect priority &gt;=0
       * </pre>
       *
       * <code>uint32 priority = 5;</code>
       * @param value The priority to set.
       * @return This builder for chaining.
       */
      public Builder setPriority(int value) {
        
        priority_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * monitoring collect priority &gt;=0
       * </pre>
       *
       * <code>uint32 priority = 5;</code>
       * @return This builder for chaining.
       */
      public Builder clearPriority() {
        
        priority_ = 0;
        onChanged();
        return this;
      }

      private long time_ ;
      /**
       * <pre>
       * collect timestamp
       * </pre>
       *
       * <code>uint64 time = 6;</code>
       * @return The time.
       */
      @Override
      public long getTime() {
        return time_;
      }
      /**
       * <pre>
       * collect timestamp
       * </pre>
       *
       * <code>uint64 time = 6;</code>
       * @param value The time to set.
       * @return This builder for chaining.
       */
      public Builder setTime(long value) {
        
        time_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * collect timestamp
       * </pre>
       *
       * <code>uint64 time = 6;</code>
       * @return This builder for chaining.
       */
      public Builder clearTime() {
        
        time_ = 0L;
        onChanged();
        return this;
      }

      private int code_ = 0;
      /**
       * <pre>
       * collect response code
       * </pre>
       *
       * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
       * @return The enum numeric value on the wire for code.
       */
      @Override public int getCodeValue() {
        return code_;
      }
      /**
       * <pre>
       * collect response code
       * </pre>
       *
       * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
       * @param value The enum numeric value on the wire for code to set.
       * @return This builder for chaining.
       */
      public Builder setCodeValue(int value) {
        
        code_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * collect response code
       * </pre>
       *
       * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
       * @return The code.
       */
      @Override
      public Code getCode() {
        @SuppressWarnings("deprecation")
        Code result = Code.valueOf(code_);
        return result == null ? Code.UNRECOGNIZED : result;
      }
      /**
       * <pre>
       * collect response code
       * </pre>
       *
       * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
       * @param value The code to set.
       * @return This builder for chaining.
       */
      public Builder setCode(Code value) {
        if (value == null) {
          throw new NullPointerException();
        }
        
        code_ = value.getNumber();
        onChanged();
        return this;
      }
      /**
       * <pre>
       * collect response code
       * </pre>
       *
       * <code>.org.apache.hertzbeat.common.entity.message.Code code = 7;</code>
       * @return This builder for chaining.
       */
      public Builder clearCode() {
        
        code_ = 0;
        onChanged();
        return this;
      }

      private Object msg_ = "";
      /**
       * <pre>
       * collect response error message
       * </pre>
       *
       * <code>string msg = 8;</code>
       * @return The msg.
       */
      public String getMsg() {
        Object ref = msg_;
        if (!(ref instanceof String)) {
          com.google.protobuf.ByteString bs =
              (com.google.protobuf.ByteString) ref;
          String s = bs.toStringUtf8();
          msg_ = s;
          return s;
        } else {
          return (String) ref;
        }
      }
      /**
       * <pre>
       * collect response error message
       * </pre>
       *
       * <code>string msg = 8;</code>
       * @return The bytes for msg.
       */
      public com.google.protobuf.ByteString
          getMsgBytes() {
        Object ref = msg_;
        if (ref instanceof String) {
          com.google.protobuf.ByteString b = 
              com.google.protobuf.ByteString.copyFromUtf8(
                  (String) ref);
          msg_ = b;
          return b;
        } else {
          return (com.google.protobuf.ByteString) ref;
        }
      }
      /**
       * <pre>
       * collect response error message
       * </pre>
       *
       * <code>string msg = 8;</code>
       * @param value The msg to set.
       * @return This builder for chaining.
       */
      public Builder setMsg(
          String value) {
        if (value == null) {
    throw new NullPointerException();
  }
  
        msg_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * collect response error message
       * </pre>
       *
       * <code>string msg = 8;</code>
       * @return This builder for chaining.
       */
      public Builder clearMsg() {
        
        msg_ = getDefaultInstance().getMsg();
        onChanged();
        return this;
      }
      /**
       * <pre>
       * collect response error message
       * </pre>
       *
       * <code>string msg = 8;</code>
       * @param value The bytes for msg to set.
       * @return This builder for chaining.
       */
      public Builder setMsgBytes(
          com.google.protobuf.ByteString value) {
        if (value == null) {
    throw new NullPointerException();
  }
  checkByteStringIsUtf8(value);
        
        msg_ = value;
        onChanged();
        return this;
      }

      private com.google.protobuf.ByteString data_ = com.google.protobuf.ByteString.EMPTY;
      /**
       * <pre>
       * collected metric data
       * </pre>
       *
       * <code>bytes data = 9;</code>
       * @return The data.
       */
      @Override
      public com.google.protobuf.ByteString getData() {
        return data_;
      }
      /**
       * <pre>
       * collected metric data
       * </pre>
       *
       * <code>bytes data = 9;</code>
       * @param value The data to set.
       * @return This builder for chaining.
       */
      public Builder setData(com.google.protobuf.ByteString value) {
        if (value == null) {
    throw new NullPointerException();
  }
  
        data_ = value;
        onChanged();
        return this;
      }
      /**
       * <pre>
       * collected metric data
       * </pre>
       *
       * <code>bytes data = 9;</code>
       * @return This builder for chaining.
       */
      public Builder clearData() {
        
        data_ = getDefaultInstance().getData();
        onChanged();
        return this;
      }
      @Override
      public final Builder setUnknownFields(
          final com.google.protobuf.UnknownFieldSet unknownFields) {
        return super.setUnknownFields(unknownFields);
      }

      @Override
      public final Builder mergeUnknownFields(
          final com.google.protobuf.UnknownFieldSet unknownFields) {
        return super.mergeUnknownFields(unknownFields);
      }


      // @@protoc_insertion_point(builder_scope:org.apache.hertzbeat.common.entity.message.MetricsData)
    }

    // @@protoc_insertion_point(class_scope:org.apache.hertzbeat.common.entity.message.MetricsData)
    private static final MetricsData DEFAULT_INSTANCE;
    static {
      DEFAULT_INSTANCE = new MetricsData();
    }

    public static MetricsData getDefaultInstance() {
      return DEFAULT_INSTANCE;
    }

    private static final com.google.protobuf.Parser<MetricsData>
        PARSER = new com.google.protobuf.AbstractParser<MetricsData>() {
      @Override
      public MetricsData parsePartialFrom(
          com.google.protobuf.CodedInputStream input,
          com.google.protobuf.ExtensionRegistryLite extensionRegistry)
          throws com.google.protobuf.InvalidProtocolBufferException {
        Builder builder = newBuilder();
        try {
          builder.mergeFrom(input, extensionRegistry);
        } catch (com.google.protobuf.InvalidProtocolBufferException e) {
          throw e.setUnfinishedMessage(builder.buildPartial());
        } catch (com.google.protobuf.UninitializedMessageException e) {
          throw e.asInvalidProtocolBufferException().setUnfinishedMessage(builder.buildPartial());
        } catch (java.io.IOException e) {
          throw new com.google.protobuf.InvalidProtocolBufferException(e)
              .setUnfinishedMessage(builder.buildPartial());
        }
        return builder.buildPartial();
      }
    };

    public static com.google.protobuf.Parser<MetricsData> parser() {
      return PARSER;
    }

    @Override
    public com.google.protobuf.Parser<MetricsData> getParserForType() {
      return PARSER;
    }

    @Override
    public MetricsData getDefaultInstanceForType() {
      return DEFAULT_INSTANCE;
    }

  }

  private static final com.google.protobuf.Descriptors.Descriptor
    internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_descriptor;
  private static final 
    com.google.protobuf.GeneratedMessageV3.FieldAccessorTable
      internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_fieldAccessorTable;

  public static com.google.protobuf.Descriptors.FileDescriptor
      getDescriptor() {
    return descriptor;
  }
  private static  com.google.protobuf.Descriptors.FileDescriptor
      descriptor;
  static {
    String[] descriptorData = {
      "\n\021collect_rep.proto\022*org.apache.hertzbea" +
      "t.common.entity.message\"\304\001\n\013MetricsData\022" +
      "\n\n\002id\030\001 \001(\004\022\020\n\010tenantId\030\002 \001(\004\022\013\n\003app\030\003 \001" +
      "(\t\022\017\n\007metrics\030\004 \001(\t\022\020\n\010priority\030\005 \001(\r\022\014\n" +
      "\004time\030\006 \001(\004\022>\n\004code\030\007 \001(\01620.org.apache.h" +
      "ertzbeat.common.entity.message.Code\022\013\n\003m" +
      "sg\030\010 \001(\t\022\014\n\004data\030\t \001(\014*b\n\004Code\022\013\n\007SUCCES" +
      "S\020\000\022\020\n\014UN_AVAILABLE\020\001\022\020\n\014UN_REACHABLE\020\002\022" +
      "\022\n\016UN_CONNECTABLE\020\003\022\010\n\004FAIL\020\004\022\013\n\007TIMEOUT" +
      "\020\005b\006proto3"
    };
    descriptor = com.google.protobuf.Descriptors.FileDescriptor
      .internalBuildGeneratedFileFrom(descriptorData,
        new com.google.protobuf.Descriptors.FileDescriptor[] {
        });
    internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_descriptor =
      getDescriptor().getMessageTypes().get(0);
    internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_fieldAccessorTable = new
      com.google.protobuf.GeneratedMessageV3.FieldAccessorTable(
        internal_static_org_apache_hertzbeat_common_entity_message_MetricsData_descriptor,
        new String[] { "Id", "TenantId", "App", "Metrics", "Priority", "Time", "Code", "Msg", "Data", });
  }

  // @@protoc_insertion_point(outer_class_scope)
}
