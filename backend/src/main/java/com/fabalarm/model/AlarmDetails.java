package com.fabalarm.model;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "kind")
@JsonSubTypes({
    @JsonSubTypes.Type(value = SpcOocDetails.class, name = "spc_ooc")
})
public sealed interface AlarmDetails permits SpcOocDetails {
}
