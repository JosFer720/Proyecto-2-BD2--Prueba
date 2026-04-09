from neo4j.time import Date, DateTime, Duration


def serialize_value(v):
    if isinstance(v, (Date, DateTime)):
        return v.iso_format()
    if isinstance(v, Duration):
        return str(v)
    if isinstance(v, list):
        return [serialize_value(item) for item in v]
    return v


def node_to_dict(record, alias="n"):
    node = record[alias]
    data = {k: serialize_value(v) for k, v in node.items()}
    data["labels"] = list(node.labels)
    return data
