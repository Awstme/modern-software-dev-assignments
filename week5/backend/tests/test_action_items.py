from sqlalchemy.orm import Session


def create_action_item(client, description):
    r = client.post("/action-items/", json={"description": description})
    assert r.status_code == 201, r.text
    return r.json()


def test_create_and_complete_action_item(client):
    payload = {"description": "Ship it"}
    r = client.post("/action-items/", json=payload)
    assert r.status_code == 201, r.text
    item = r.json()
    assert item["completed"] is False

    r = client.put(f"/action-items/{item['id']}/complete")
    assert r.status_code == 200
    done = r.json()
    assert done["completed"] is True

    r = client.get("/action-items/")
    assert r.status_code == 200
    items = r.json()
    assert len(items) == 1


def test_list_action_items_filters_by_completed(client):
    first = create_action_item(client, "Draft release notes")
    second = create_action_item(client, "Ship release")
    third = create_action_item(client, "Collect feedback")

    r = client.put(f"/action-items/{second['id']}/complete")
    assert r.status_code == 200

    r = client.get("/action-items/")
    assert r.status_code == 200
    assert {item["id"] for item in r.json()} == {first["id"], second["id"], third["id"]}

    r = client.get("/action-items/", params={"completed": "true"})
    assert r.status_code == 200
    assert [item["id"] for item in r.json()] == [second["id"]]

    r = client.get("/action-items/", params={"completed": "false"})
    assert r.status_code == 200
    assert {item["id"] for item in r.json()} == {first["id"], third["id"]}


def test_bulk_complete_action_items_success(client):
    first = create_action_item(client, "Draft release notes")
    second = create_action_item(client, "Ship release")
    third = create_action_item(client, "Collect feedback")

    r = client.post("/action-items/bulk-complete", json=[first["id"], third["id"]])
    assert r.status_code == 200, r.text
    completed = r.json()
    assert [item["id"] for item in completed] == [first["id"], third["id"]]
    assert all(item["completed"] is True for item in completed)

    r = client.get("/action-items/", params={"completed": "false"})
    assert r.status_code == 200
    assert [item["id"] for item in r.json()] == [second["id"]]


def test_bulk_complete_rejects_invalid_ids(client):
    r = client.post("/action-items/bulk-complete")
    assert r.status_code == 422

    r = client.post("/action-items/bulk-complete", json=[])
    assert r.status_code == 400

    r = client.post("/action-items/bulk-complete", json=[0, -1])
    assert r.status_code == 400
    assert r.json()["detail"] == {"invalid_ids": [0, -1]}


def test_bulk_complete_missing_ids_rolls_back(client):
    item = create_action_item(client, "Stay incomplete")

    r = client.post("/action-items/bulk-complete", json=[item["id"], 9999])
    assert r.status_code == 404
    assert r.json()["detail"] == {"missing_ids": [9999]}

    r = client.get("/action-items/", params={"completed": "false"})
    assert r.status_code == 200
    assert [remaining["id"] for remaining in r.json()] == [item["id"]]


def test_bulk_complete_flush_error_rolls_back(client, monkeypatch):
    item = create_action_item(client, "Rollback on database error")

    def fail_flush(self):
        raise RuntimeError("simulated flush failure")

    with monkeypatch.context() as patch:
        patch.setattr(Session, "flush", fail_flush)
        r = client.post("/action-items/bulk-complete", json=[item["id"]])

    assert r.status_code == 500
    assert r.json()["detail"] == "Failed to bulk complete action items"

    r = client.get("/action-items/", params={"completed": "false"})
    assert r.status_code == 200
    assert [remaining["id"] for remaining in r.json()] == [item["id"]]
